import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/require-staff.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateStaffBody {
  name: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
  color?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Provisioning an account grants the staff role, so only an administrator
    // may do it. A field technician holds the same staff claim and must not be
    // able to mint further accounts.
    const staffCheck = await requireAdmin(req, supabaseUrl, serviceRoleKey);
    if (!staffCheck.ok) {
      return new Response(
        JSON.stringify({ error: staffCheck.error }),
        { status: staffCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { name, email, password, role, phone, color }: CreateStaffBody = await req.json();

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Name, email, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { name, role: role || "Technician" },
      app_metadata: { role: "staff" },
    });

    if (authError) {
      console.error("create-staff auth error:", authError.message);
      return new Response(
        JSON.stringify({ error: "Could not create the staff account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: techData, error: techError } = await admin
      .from("technicians")
      .insert({
        name,
        email: email.toLowerCase().trim(),
        role: role || "Technician",
        phone: phone || "",
        color: color || "gold",
        active: true,
        auth_id: authData.user.id,
      })
      .select()
      .single();

    if (techError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      console.error("create-staff technician insert error:", techError.message);
      return new Response(
        JSON.stringify({ error: "Could not create the staff account." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ technician: techData, auth_id: authData.user.id }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-staff unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});