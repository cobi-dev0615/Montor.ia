"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ChatHeader } from "./ChatHeader";
import { ProgressUpdateToast } from "./ProgressUpdateToast";
import { useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

type PlanWizardStep =
  | "idle"
  | "permission"
  | "age"
  | "objective"
  | "objectiveClarify"
  | "level"
  | "availability"
  | "termConfirmation"
  | "creating";

type PlanWizardLevel = "beginner" | "intermediate" | "advanced";

interface PlanWizardData {
  age?: number;
  objective?: string;
  level?: PlanWizardLevel;
  availability?: number;
  termWeeks?: number;
  suggestedTerm?: number;
}

interface GoalSummary {
  id: string;
  status: string;
  title: string;
  main_goal: string;
  hasPlan?: boolean;
}

interface ChatInterfaceProps {
  context?: string | null;
  variant?: "default" | "dock";
}

export function ChatInterface({
  context = null,
  variant = "default",
}: ChatInterfaceProps = {}) {
  const searchParams = useSearchParams();
  const goalId = searchParams.get("goalId");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [progressUpdate, setProgressUpdate] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [existingGoals, setExistingGoals] = useState<GoalSummary[] | null>(null);
  const [planWizardStep, setPlanWizardStep] = useState<PlanWizardStep>("idle");
  const [planWizardData, setPlanWizardData] = useState<PlanWizardData>({});
  const [planWizardActive, setPlanWizardActive] = useState(false);
  const [planWizardLoading, setPlanWizardLoading] = useState(false);
  const [planProfileSnapshot, setPlanProfileSnapshot] = useState<any>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [autoWizardTriggered, setAutoWizardTriggered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseClient();

  const appendLocalMessage = useCallback(
    (role: Message["role"], content: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${role}-${Date.now()}-${Math.random()}`,
          role,
          content,
          created_at: new Date().toISOString(),
        },
      ]);
    },
    []
  );

  const fetchGoalsSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/goals");
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      const goalsList: GoalSummary[] = (data.goals || []).map((goal: any) => ({
        id: goal.id,
        status: goal.status,
        title: goal.title,
        main_goal: goal.main_goal,
        hasPlan: Boolean(goal.hasPlan),
      }));
      setExistingGoals(goalsList);
      return goalsList;
    } catch (error) {
      console.error("Error fetching goals summary:", error);
      return null;
    }
  }, []);

  const resetPlanWizard = useCallback(() => {
    setPlanWizardActive(false);
    setPlanWizardStep("idle");
    setPlanWizardData({});
    setPlanWizardLoading(false);
  }, []);

  const loadMessages = useCallback(
    async (userId: string) => {
      try {
        const query = supabase
          .from("messages")
          .select("*")
          .eq("user_id", userId)
          .eq("is_deleted", false);

        if (goalId) {
          query.eq("goal_id", goalId);
        }

        if (variant === "dock") {
          query.order("created_at", { ascending: false }).limit(2);
        } else {
          query.order("created_at", { ascending: true });
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error("Error fetching messages:", fetchError);
          return;
        }

        if (data) {
          if (variant === "dock") {
            const ordered = [...(data as Message[])].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
            setMessages(ordered);
          } else {
            setMessages(data as Message[]);
          }
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    },
    [goalId, supabase, variant]
  );

  const hasActivePlan = useMemo(() => {
    if (!existingGoals) return false;
    return existingGoals.some(
      (goal) => goal.status !== "completed" && goal.hasPlan
    );
  }, [existingGoals]);

  const hasActiveGoalWithoutPlan = useMemo(() => {
    if (!existingGoals) return false;
    return existingGoals.some(
      (goal) => goal.status !== "completed" && !goal.hasPlan
    );
  }, [existingGoals]);

  const isPositiveResponse = (text: string) => {
    const normalized = text.toLowerCase().trim();
    const positives = [
      "sim",
      "claro",
      "com certeza",
      "ok",
      "okay",
      "sim!",
      "bora",
      "vamos",
      "pode",
      "pode sim",
      "yes",
    ];
    return positives.some((word) => normalized.includes(word));
  };

  const extractNumberFromText = (text: string) => {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const normalizeLevel = (text: string): PlanWizardLevel | null => {
    const normalized = text.toLowerCase();
    if (normalized.includes("inic")) return "beginner";
    if (normalized.includes("inter")) return "intermediate";
    if (normalized.includes("avan")) return "advanced";
    return null;
  };

  const computeSuggestedTerm = (
    level: PlanWizardLevel,
    availability: number,
    objective?: string
  ) => {
    let baseWeeks: number;
    switch (level) {
      case "beginner":
        baseWeeks = 8;
        break;
      case "intermediate":
        baseWeeks = 6;
        break;
      case "advanced":
      default:
        baseWeeks = 4;
        break;
    }

    if (availability >= 6) {
      baseWeeks = Math.max(2, baseWeeks - 2);
    } else if (availability >= 4) {
      baseWeeks = Math.max(3, baseWeeks - 1);
    } else if (availability <= 2) {
      baseWeeks += 2;
    }

    const objectiveLength = objective ? objective.split(/\s+/).filter(Boolean).length : 0;
    if (objectiveLength > 0 && objectiveLength <= 5) {
      baseWeeks = Math.max(1, baseWeeks - 2);
    }

    return Math.min(24, Math.max(1, baseWeeks));
  };

  const buildTermPrompt = (suggestedTerm?: number) => {
    if (!suggestedTerm) {
      return "Quanto tempo você estima ser adequado? Pode responder com dias ou semanas, por exemplo: 3 dias ou 2 semanas.";
    }
    const label = suggestedTerm === 1 ? "1 semana" : `${suggestedTerm} semanas`;
    return `Com base nisso, sugiro um plano de ${label}. Isso equilibra o desafio com o seu ritmo. Está tudo bem para você? Se preferir outro período, me diga quantos dias ou semanas você gostaria.`;
  };

  const parseDurationInput = (input: string, fallbackWeeks?: number) => {
    const lower = input.toLowerCase();
    const numberMatch = lower.match(/(\d+)/);
    if (!numberMatch) {
      if (/(a|one|um|uma)\s+day/.test(lower) || /um dia/.test(lower) || /uma dia/.test(lower)) {
        return 1;
      }
      if (/(a|one|um|uma)\s+week/.test(lower) || /uma semana/.test(lower) || /um semana/.test(lower)) {
        return 1;
      }
      if (/couple of days/.test(lower) || /dois dias/.test(lower) || /duas dias/.test(lower)) {
        return 1;
      }
      return fallbackWeeks ? Math.max(1, Math.min(52, fallbackWeeks)) : null;
    }

    const value = parseInt(numberMatch[1], 10);
    if (Number.isNaN(value) || value <= 0) {
      return fallbackWeeks ? Math.max(1, Math.min(52, fallbackWeeks)) : null;
    }

    if (/\b(dia|dias|day|days)\b/.test(lower)) {
      const weeks = Math.max(1, Math.ceil(value / 7));
      return Math.min(52, weeks);
    }

    if (/\b(semana|semanas|week|weeks)\b/.test(lower)) {
      return Math.min(52, Math.max(1, value));
    }

    return Math.min(52, Math.max(1, value));
  };

  const ensureProfileStored = useCallback(
    async (profile: PlanWizardData & { updated_at: string }) => {
      if (!currentUser) return;
      try {
        await supabase
          .from("users")
          .update({
            onboarding_data: {
              ...(planProfileSnapshot || {}),
              chat_plan_profile: profile,
            },
          })
          .eq("id", currentUser.id);
      } catch (error) {
        console.error("Error saving plan profile:", error);
      }
    },
    [currentUser, planProfileSnapshot, supabase]
  );

  const handlePlanCreation = useCallback(
    async (data: Required<PlanWizardData>) => {
      if (!currentUser) {
        appendLocalMessage(
          "assistant",
          "Não consegui confirmar o usuário autenticado. Por favor, faça login novamente."
        );
        resetPlanWizard();
        return;
      }

      setPlanWizardLoading(true);
      setLoading(true);

      appendLocalMessage(
        "assistant",
        "Perfeito! Vou estruturar sua meta e plano agora. Só um instante..."
      );

      try {
        const title =
          data.objective!.length > 60
            ? `${data.objective!.slice(0, 57)}...`
            : data.objective!;

        const goalResponse = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            main_goal: data.objective,
            description: `Meta criada via Mentor.ai (plano de ${data.termWeeks} semanas).`,
          }),
        });

        if (!goalResponse.ok) {
          const goalError = await goalResponse.json().catch(() => ({}));
          throw new Error(
            goalError?.error ||
              "Não foi possível criar a meta no momento. Tente novamente."
          );
        }

        const { goal } = await goalResponse.json();
        const goalId = goal?.id;

        if (!goalId) {
          throw new Error("Meta criada, mas não recebemos o identificador.");
        }

        const planResponse = await fetch(
          `/api/goals/${goalId}/generate-plan`,
          {
            method: "POST",
          }
        );

        if (!planResponse.ok) {
          const planError = await planResponse.json().catch(() => ({}));
          throw new Error(
            planError?.error ||
              "Não foi possível gerar o plano agora. Você pode tentar novamente na página de Metas."
          );
        }

        const profileToPersist = {
          age: data.age,
          objective: data.objective,
          level: data.level,
          availability: data.availability,
          termWeeks: data.termWeeks,
          suggestedTerm: data.suggestedTerm,
          updated_at: new Date().toISOString(),
        };

        await ensureProfileStored(profileToPersist);

      const weeksLabel = data.termWeeks === 1 ? "1 semana" : `${data.termWeeks} semanas`;
      appendLocalMessage(
        "assistant",
        `Tudo pronto! Criei a meta "${goal.title}" e montei um plano de ${weeksLabel} adaptado ao que você compartilhou. Você pode ver cada marco e micro-ação na página de Metas. Quando estiver pronto, siga para a próxima ação e me conte como foi!`
      );

        resetPlanWizard();
        setPlanWizardData({});

        // Atualiza lista de metas em cache
        await fetchGoalsSummary();

        // Notifica outras telas
        window.dispatchEvent(
          new CustomEvent("goalsUpdated", {
            detail: { goalId, source: "chat-plan-wizard" },
          })
        );
      } catch (error) {
        console.error("Error creating plan via wizard:", error);
        const message =
          error instanceof Error ? error.message : "Erro inesperado.";
        appendLocalMessage(
          "assistant",
          `Encontrei um problema ao criar seu plano: ${message} Você pode tentar novamente ou abrir a página de Metas para continuar por lá.`
        );
        resetPlanWizard();
      } finally {
        setPlanWizardLoading(false);
        setLoading(false);
      }
    },
    [
      appendLocalMessage,
      currentUser,
      ensureProfileStored,
      fetchGoalsSummary,
      resetPlanWizard,
      setLoading,
    ]
  );

  // Listen for progress updates
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      setProgressUpdate(event.detail);
    };

    window.addEventListener(
      "progressUpdate",
      handleProgressUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "progressUpdate",
        handleProgressUpdate as EventListener
      );
    };
  }, []);

  // Fetch user name and message history on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUser(user);

        // Fetch user name
        const { data: userData } = await supabase
          .from("users")
          .select("full_name, onboarding_data")
          .eq("id", user.id)
          .single();

        if (userData?.full_name) {
          setUserName(userData.full_name);
        } else {
          setUserName(user.email?.split("@")[0] || "Usuário");
        }

        if (userData?.onboarding_data) {
          setPlanProfileSnapshot(userData.onboarding_data);
        }

        await fetchGoalsSummary();
        await loadMessages(user.id);
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        setInitialDataLoaded(true);
      }
    };

    fetchUserData();
  }, [fetchGoalsSummary, goalId, loadMessages, supabase]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const processPlanWizardInput = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      appendLocalMessage("user", content);

      switch (planWizardStep) {
        case "permission": {
          if (isPositiveResponse(content)) {
            setPlanWizardStep("age");
            appendLocalMessage(
              "assistant",
              "Ótimo! Para começar, quantos anos você tem?"
            );
          } else {
            appendLocalMessage(
              "assistant",
              "Sem problemas! Quando quiser, é só me avisar que iniciamos a criação do seu plano."
            );
            resetPlanWizard();
          }
          return;
        }
        case "age": {
          const age = extractNumberFromText(content);
          if (!age || age < 5 || age > 100) {
            appendLocalMessage(
              "assistant",
              "Para eu planejar melhor, me conte sua idade usando números. Por exemplo: \"Tenho 28 anos\"."
            );
            return;
          }
          setPlanWizardData((prev) => ({ ...prev, age }));
          setPlanWizardStep("objective");
          appendLocalMessage(
            "assistant",
            "Perfeito! Agora, me diga: qual é a principal coisa que você quer conquistar neste momento?"
          );
          return;
        }
        case "objective": {
          const words = content.split(/\s+/).filter(Boolean);
          const isDetailed = words.length >= 5 || content.length >= 25;

          if (!isDetailed) {
            setPlanWizardData((prev) => ({ ...prev, objective: content }));
            setPlanWizardStep("objectiveClarify");
            appendLocalMessage(
              "assistant",
              "Entendi! Poderia compartilhar um pouco mais de detalhes? O que exatamente você quer alcançar ou melhorar?"
            );
            return;
          }

          setPlanWizardData((prev) => ({ ...prev, objective: content }));
          setPlanWizardStep("level");
          appendLocalMessage(
            "assistant",
            "E como você descreve seu nível atual nesse assunto? Pode responder com \"Iniciante\", \"Intermediário\" ou \"Avançado\"."
          );
          return;
        }
        case "objectiveClarify": {
          const baseObjective = planWizardData.objective || "";
          const detailedObjective = `${baseObjective} ${content}`.trim();
          setPlanWizardData((prev) => ({ ...prev, objective: detailedObjective }));
          setPlanWizardStep("level");
          appendLocalMessage(
            "assistant",
            "Perfeito! Agora, como você avalia seu nível atual nesse tema? Responda com \"Iniciante\", \"Intermediário\" ou \"Avançado\"."
          );
          return;
        }
        case "level": {
          const level = normalizeLevel(content);
          if (!level) {
            appendLocalMessage(
              "assistant",
              "Para adaptar o plano, preciso que você escolha entre \"Iniciante\", \"Intermediário\" ou \"Avançado\". Qual opção representa melhor sua situação?"
            );
            return;
          }
          setPlanWizardData((prev) => ({ ...prev, level }));
          setPlanWizardStep("availability");
          appendLocalMessage(
            "assistant",
            "Ótimo! Quantos dias por semana você consegue dedicar a essa meta? Responda com um número entre 1 e 7."
          );
          return;
        }
        case "availability": {
          const availability = extractNumberFromText(content);
          if (!availability || availability < 1 || availability > 7) {
            appendLocalMessage(
              "assistant",
              "Para planejar sua rotina, me diga quantos dias por semana você pode se dedicar. Use um número de 1 a 7."
            );
            return;
          }

          setPlanWizardData((prev) => ({ ...prev, availability }));
          if (!planWizardData.level) {
            setPlanWizardStep("level");
            appendLocalMessage(
              "assistant",
              "Antes de seguir, preciso saber seu nível atual: \"Iniciante\", \"Intermediário\" ou \"Avançado\"?"
            );
            return;
          }

          const suggestedTerm = computeSuggestedTerm(
            planWizardData.level!,
            availability,
            planWizardData.objective
          );

          setPlanWizardData((prev) => ({
            ...prev,
            availability,
            suggestedTerm,
          }));
          setPlanWizardStep("termConfirmation");

          appendLocalMessage("assistant", buildTermPrompt(suggestedTerm));
          return;
        }
        case "termConfirmation": {
          const parsedTerm = parseDurationInput(content, planWizardData.suggestedTerm);
          if (parsedTerm) {
            const finalizedData = {
              ...planWizardData,
              termWeeks: parsedTerm,
              suggestedTerm: planWizardData.suggestedTerm,
            } as Required<PlanWizardData>;
            setPlanWizardData(finalizedData);
            setPlanWizardStep("creating");
            await handlePlanCreation(finalizedData);
            return;
          }

          if (isPositiveResponse(content) && planWizardData.suggestedTerm) {
            const finalizedData = {
              ...planWizardData,
              termWeeks: planWizardData.suggestedTerm,
              suggestedTerm: planWizardData.suggestedTerm,
            } as Required<PlanWizardData>;
            setPlanWizardData(finalizedData);
            setPlanWizardStep("creating");
            await handlePlanCreation(finalizedData);
            return;
          }

          appendLocalMessage(
            "assistant",
            "Sem problemas! Me diga em quantos dias ou semanas você quer concluir esse plano (por exemplo: 5 dias ou 2 semanas)."
          );
          return;
        }
        default:
          appendLocalMessage(
            "assistant",
            "Algo inesperado aconteceu com o fluxo do plano. Vamos tentar novamente mais tarde."
          );
          resetPlanWizard();
      }
    },
    [
      appendLocalMessage,
      computeSuggestedTerm,
      handlePlanCreation,
      isPositiveResponse,
      normalizeLevel,
      planWizardData,
      planWizardStep,
      resetPlanWizard,
    ]
  );

  const startPlanWizard = useCallback(
    async (initiatedByMessage = false) => {
      if (planWizardActive || planWizardLoading) {
        return true;
      }

      let goals = existingGoals;
      if (!goals) {
        const fetched = await fetchGoalsSummary();
        goals = Array.isArray(fetched) ? fetched : [];
      }

      const goalList = Array.isArray(goals) ? goals : [];
      const activeGoals = goalList.filter((goal) => goal.status !== "completed");
      const activeGoalsWithPlan = activeGoals.filter((goal) => goal.hasPlan);
      const activeGoalsWithoutPlan = activeGoals.filter((goal) => !goal.hasPlan);

      if (activeGoalsWithPlan.length > 0) {
        if (initiatedByMessage) {
          appendLocalMessage(
            "assistant",
            "Percebo que você já tem um plano em andamento. Me conte como foi sua última ação ou se precisa de ajuda para o próximo passo, e avançamos juntos!"
          );
        }
        return false;
      }

      if (activeGoalsWithoutPlan.length > 1) {
        appendLocalMessage(
          "assistant",
          "Você tem mais de uma meta ativa sem plano no momento. Vamos escolher qual delas você quer transformar em um plano agora?"
        );
        return false;
      }

      setPlanWizardActive(true);
      setPlanWizardStep("permission");
      appendLocalMessage(
        "assistant",
        "Oi! Antes de começarmos, quero te conhecer um pouco melhor para criar um plano sob medida. Posso te fazer algumas perguntas rápidas?"
      );
      return true;
    },
    [
      appendLocalMessage,
      existingGoals,
      fetchGoalsSummary,
      planWizardActive,
      planWizardLoading,
    ]
  );

  const getLastAssistantMessage = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const detectPlanRequest = (content: string) => {
    const normalized = content.toLowerCase();
    return (
      normalized.includes("criar plano") ||
      normalized.includes("gerar plano") ||
      normalized.includes("novo plano") ||
      normalized.includes("criar meta") ||
      normalized.includes("quero um plano")
    );
  };

  const handleSend = async (rawContent: string) => {
    const trimmedContent = rawContent.trim();
    if (!trimmedContent) return;

    if (planWizardStep === "creating" || planWizardLoading) {
      return;
    }

    const lastAssistantMessage = getLastAssistantMessage();
    const assistantInvitedForWizard =
      lastAssistantMessage &&
      /posso te fazer algumas perguntas/i.test(
        lastAssistantMessage.content || ""
      );

    if (
      !planWizardActive &&
      !planWizardLoading &&
      assistantInvitedForWizard &&
      isPositiveResponse(trimmedContent)
    ) {
      appendLocalMessage("user", trimmedContent);
      setPlanWizardActive(true);
      setPlanWizardStep("age");
      setPlanWizardData({});
      setAutoWizardTriggered(true);
      appendLocalMessage(
        "assistant",
        "Ótimo! Para começar, quantos anos você tem?"
      );
      return;
    }

    if (planWizardActive && planWizardStep !== "idle") {
      await processPlanWizardInput(trimmedContent);
      return;
    }

    if (detectPlanRequest(trimmedContent)) {
      appendLocalMessage("user", trimmedContent);
      const started = await startPlanWizard(true);
      if (!started) {
        resetPlanWizard();
      }
      return;
    }

    if (loading) return;

    setLoading(true);
    setError(null);

    // Optimistically add user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: trimmedContent,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Send message to API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedContent,
          goalId: goalId || null,
          context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao enviar mensagem");
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle progress update if keyword was detected
      if (data.progressUpdate) {
        setProgressUpdate(data.progressUpdate);
        // Trigger progress update event for parent components
        window.dispatchEvent(
          new CustomEvent("progressUpdate", {
            detail: data.progressUpdate,
          })
        );
      }

      // Refresh messages from database to get actual IDs
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Ensure userName is set if not already
        if (!userName) {
          const { data: userData } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", user.id)
            .single();

          if (userData?.full_name) {
            setUserName(userData.full_name);
          } else {
            setUserName(user.email?.split("@")[0] || "Usuário");
          }
        }

        await loadMessages(user.id);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Falha ao enviar mensagem");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (clearing) return;
    setClearing(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const response = await fetch("/api/chat/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          updates: {
            is_deleted: true,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error ||
            "Falha ao limpar histórico de chat"
        );
      }

      setMessages([]);
    } catch (err) {
      console.error("Error clearing chat history:", err);
      setError(
        err instanceof Error ? err.message : "Falha ao limpar histórico de chat"
      );
    } finally {
      setClearing(false);
    }
  };

  const inputDisabled = loading || planWizardLoading;

  const hasCollectedProfile = useMemo(() => {
    if (!planProfileSnapshot) return false;
    const profile =
      planProfileSnapshot.chat_plan_profile || planProfileSnapshot || {};
    const { age, objective, availability, level } = profile;
    return (
      typeof age === "number" &&
      age > 0 &&
      typeof objective === "string" &&
      objective.length > 0 &&
      typeof availability === "number" &&
      availability > 0 &&
      typeof level === "string" &&
      level.length > 0
    );
  }, [planProfileSnapshot]);

  useEffect(() => {
    if (
      autoWizardTriggered ||
      planWizardActive ||
      planWizardLoading ||
      !initialDataLoaded
    ) {
      return;
    }

    if (existingGoals === null) {
      return;
    }

    if (hasActivePlan) {
      return;
    }

    if (messages.length > 0) {
      return;
    }

    if (hasCollectedProfile) {
      return;
    }

    if (!hasActiveGoalWithoutPlan && existingGoals && existingGoals.length > 0) {
      return;
    }

    startPlanWizard(false)
      .then((started) => {
        if (started) {
          setAutoWizardTriggered(true);
        }
      })
      .catch(() => {});
  }, [
    autoWizardTriggered,
    existingGoals,
    hasCollectedProfile,
    hasActiveGoalWithoutPlan,
    hasActivePlan,
    initialDataLoaded,
    messages.length,
    planWizardActive,
    planWizardLoading,
    startPlanWizard,
  ]);

  const containerClasses =
    variant === "dock"
      ? "flex flex-col h-full bg-transparent"
      : "flex flex-col h-full glass-card rounded-lg border border-[rgba(0,212,255,0.3)] shadow-[0_0_30px_rgba(0,212,255,0.2)]";

  return (
    <div className={containerClasses}>
      <ChatHeader
        goalId={goalId || undefined}
        onClearHistory={handleClearHistory}
        clearing={clearing}
        variant={variant}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Inicie uma conversa com seu mentor de IA...</p>
          </div>
        )}
        <MessageList messages={messages} userName={userName} />
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm mt-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            <span>Mentor está pensando...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={inputDisabled} />

      {/* Progress Update Toast */}
      {progressUpdate && (
        <ProgressUpdateToast
          progressUpdate={progressUpdate}
          onClose={() => setProgressUpdate(null)}
        />
      )}
    </div>
  );
}
