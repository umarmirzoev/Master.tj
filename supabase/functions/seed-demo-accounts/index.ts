import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge function создаёт или обновляет демо-аккаунты администраторов для тестовой среды.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accounts = [
      { email: "admin1@masterchas.tj", password: "Admin123!", role: "admin", name: "Админ Первый" },
      { email: "admin2@masterchas.tj", password: "Admin123!", role: "admin", name: "Админ Второй" },
      { email: "superadmin@masterchas.tj", password: "SuperAdmin123!", role: "super_admin", name: "Суперадмин" },
      { email: "umarmitzoev@gmail.com", password: "umarjon.1711", role: "client", name: "Умар Мирзоев" },
    ];

    const results = [];

    for (const account of accounts) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === account.email);

      if (existing) {
        // Update password to ensure it matches
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: account.password,
          email_confirm: true,
        });

        if (updateError) {
          results.push({ email: account.email, status: "password_update_error", error: updateError.message });
          continue;
        }

        // Ensure role exists
        const { data: existingRoles } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", existing.id)
          .eq("role", account.role);

        if (!existingRoles || existingRoles.length === 0) {
          await supabaseAdmin.from("user_roles").insert({
            user_id: existing.id,
            role: account.role,
          });
        }

        // Ensure profile exists
        const { data: profileData } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("user_id", existing.id);

        if (!profileData || profileData.length === 0) {
          await supabaseAdmin.from("profiles").insert({
            user_id: existing.id,
            full_name: account.name,
          });
        }

        results.push({ email: account.email, status: "updated", id: existing.id });
        continue;
      }

      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.name },
      });

      if (createError) {
        results.push({ email: account.email, status: "error", error: createError.message });
        continue;
      }

      if (newUser?.user) {
        // The handle_new_user trigger creates profile + client role
        // We need to add the admin/super_admin role
        await supabaseAdmin.from("user_roles").insert({
          user_id: newUser.user.id,
          role: account.role,
        });

        await supabaseAdmin.from("profiles").update({
          full_name: account.name,
        }).eq("user_id", newUser.user.id);

        results.push({ email: account.email, status: "created", id: newUser.user.id, role: account.role });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      accounts: results,
      credentials: {
        admin1: { email: "admin1@masterchas.tj", password: "Admin123!" },
        admin2: { email: "admin2@masterchas.tj", password: "Admin123!" },
        superadmin: { email: "superadmin@masterchas.tj", password: "SuperAdmin123!" },
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
