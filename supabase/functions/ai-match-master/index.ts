import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Edge function анализирует описание проблемы и подбирает категорию, услугу и подходящих мастеров.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description, district, urgency, budget } = await req.json();
    const MASTERCHAS_AI_API_KEY =
      Deno.env.get("MASTERCHAS_AI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
    if (!MASTERCHAS_AI_API_KEY) {
      throw new Error("MASTERCHAS_AI_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Fetch categories and services for context
    const catRes = await fetch(`${SUPABASE_URL}/rest/v1/service_categories?select=id,name_ru`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    const categories = await catRes.json();

    const svcRes = await fetch(`${SUPABASE_URL}/rest/v1/services?select=id,name_ru,category_id,price_avg&limit=500`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    const services = await svcRes.json();

    const categoryList = categories.map((c: any) => `${c.id}::${c.name_ru}`).join("\n");
    const serviceList = services.map((s: any) => `${s.id}::${s.name_ru}::cat=${s.category_id}::price=${s.price_avg}`).join("\n");

    const systemPrompt = `You are a service matching AI for Master Chas, a home services platform in Dushanbe, Tajikistan.
Given a user's problem description, determine:
1. The best matching category
2. The best matching service (or top 3 if uncertain)
3. Whether this is urgent
4. Whether a product purchase might be needed
5. Whether installation service is needed

Available categories:
${categoryList}

Available services:
${serviceList}

IMPORTANT: Return ONLY valid category_id and service_id from the lists above.
If uncertain, return multiple service suggestions.
Detect urgency from keywords like: срочно, авария, течет сильно, искрит, короткое замыкание, не закрывается, сломалось.
Detect product needs from keywords like: смеситель, люстра, розетка, камера, кондиционер, замок, лампа.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MASTERCHAS_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Problem: "${description}"\nDistrict: ${district || "not specified"}\nUrgency: ${urgency || "normal"}\nBudget: ${budget || "not specified"} somoni` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "match_service",
              description: "Match a user problem to categories and services",
              parameters: {
                type: "object",
                properties: {
                  category_id: { type: "string", description: "Best matching category UUID" },
                  category_name: { type: "string", description: "Category name in Russian" },
                  services: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        service_id: { type: "string" },
                        service_name: { type: "string" },
                        confidence: { type: "number", description: "0-1 confidence score" },
                      },
                      required: ["service_id", "service_name", "confidence"],
                    },
                    description: "Top 1-3 matching services sorted by confidence",
                  },
                  is_urgent: { type: "boolean" },
                  needs_product: { type: "boolean" },
                  needs_installation: { type: "boolean" },
                  product_keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Product keywords detected from description",
                  },
                  explanation: { type: "string", description: "Brief explanation in Russian of why this match was made" },
                },
                required: ["category_id", "category_name", "services", "is_urgent", "needs_product", "needs_installation", "explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "match_service" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Требуется пополнение баланса" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const matchResult = JSON.parse(toolCall.function.arguments);

    // Now fetch matching masters
    const mastersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/master_listings?is_active=eq.true&select=*`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const allMasters = await mastersRes.json();

    // Score and rank masters
    const scoredMasters = allMasters.map((m: any) => {
      let score = 0;
      const reasons: string[] = [];

      // Category match (highest weight)
      const catMatch = m.service_categories?.some((c: string) =>
        c.toLowerCase().includes(matchResult.category_name.toLowerCase()) ||
        matchResult.category_name.toLowerCase().includes(c.toLowerCase())
      );
      if (catMatch) { score += 40; reasons.push("Специализируется на данной услуге"); }

      // District match
      if (district && m.working_districts?.some((d: string) => d.toLowerCase().includes(district.toLowerCase()))) {
        score += 25; reasons.push("Работает в вашем районе");
      }

      // Rating
      score += (m.average_rating || 0) * 4; // max 20
      if (m.average_rating >= 4.5) reasons.push("Высокий рейтинг");

      // Completed orders
      if (m.completed_orders > 50) { score += 5; reasons.push("Большой опыт выполнения заказов"); }
      else if (m.completed_orders > 20) { score += 3; }

      // Response time for urgent
      if (matchResult.is_urgent && m.response_time_avg && m.response_time_avg < 30) {
        score += 10; reasons.push("Быстрый выезд");
      }

      // Budget fit
      if (budget && m.price_min && m.price_min <= budget) {
        score += 5; reasons.push("Подходит под ваш бюджет");
      }

      // Quality penalty
      if (m.quality_flag === "warning") score -= 10;
      if (m.quality_flag === "poor") score -= 30;

      // Top master bonus
      if (m.is_top_master) { score += 5; reasons.push("Топ мастер"); }

      return { ...m, ai_score: score, ai_reasons: reasons };
    })
      .filter((m: any) => m.ai_score > 10)
      .sort((a: any, b: any) => b.ai_score - a.ai_score)
      .slice(0, 5);

    // Assign badges
    const mastersWithBadges = scoredMasters.map((m: any, i: number) => {
      const badges: string[] = [];
      if (i === 0) badges.push("Лучший выбор");
      if (m.ai_reasons.includes("Работает в вашем районе")) badges.push("Ближе всех");
      if (m.average_rating >= 4.8) badges.push("Высокий рейтинг");
      if (m.ai_reasons.includes("Быстрый выезд")) badges.push("Быстрый выезд");
      return { ...m, ai_badges: badges };
    });

    return new Response(JSON.stringify({
      match: matchResult,
      masters: mastersWithBadges,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-match-master error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
