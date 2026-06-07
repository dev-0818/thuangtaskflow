import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ENV_FILES = [".env.local", ".env"];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  for (const file of ENV_FILES) {
    loadEnvFile(resolve(process.cwd(), file));
  }
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function printHelp() {
  console.log(`
Create or upsert a Thuang Tasks manager user in Supabase.

Usage:
  npm run create:manager -- --name "Manager Name" --email manager@example.com --password "password123"

Options:
  --name            Manager full name. Required.
  --email           Manager email address. Required.
  --password        Temporary password, minimum 8 characters. Required for new auth users.
  --job-title-id    Optional master_job_titles id.
`);
}

function requireArg(args, key) {
  const value = String(args[key] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required argument: --${key}`);
  }
  return value;
}

async function findAuthUserByEmail(supabase, email) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const existing = users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (existing) return existing;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  loadEnv();

  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const name = requireArg(args, "name");
  const email = requireArg(args, "email");
  const password = requireArg(args, "password");
  const jobTitleId = args["job-title-id"] ? Number(args["job-title-id"]) : null;

  if (password.length < 8) {
    throw new Error("--password must be at least 8 characters.");
  }

  if (jobTitleId !== null && (!Number.isInteger(jobTitleId) || jobTitleId <= 0)) {
    throw new Error("--job-title-id must be a positive integer.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const existingUser = await findAuthUserByEmail(supabase, email);
  const authUser = existingUser ?? (await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      system_role: "manager"
    }
  })).data.user;

  if (!authUser) {
    throw new Error("User creation did not return an auth user.");
  }

  if (existingUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        name,
        system_role: "manager"
      }
    });

    if (updateError) throw updateError;
  }

  const { error: profileError } = await supabase.from("users").upsert({
    id: authUser.id,
    email,
    name,
    system_role: "manager",
    can_add_subtasks: true,
    manager_id: null,
    job_title_id: jobTitleId
  }, {
    onConflict: "id"
  });

  if (profileError) throw profileError;

  console.log("Manager user is ready.");
  console.log(`Name: ${name}`);
  console.log(`Email: ${email}`);
  console.log(`Auth user id: ${authUser.id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
