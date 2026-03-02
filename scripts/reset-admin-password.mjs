import { createClient } from "@supabase/supabase-js";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const targetEmail = requiredEnv("TARGET_EMAIL").trim().toLowerCase();
const newPassword = requiredEnv("NEW_PASSWORD");

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 });

if (usersError) {
  throw new Error(usersError.message);
}

const foundUser = usersData.users.find((user) => (user.email ?? "").toLowerCase() === targetEmail);

if (!foundUser) {
  throw new Error(`User not found for email: ${targetEmail}`);
}

const { error: updateError } = await supabase.auth.admin.updateUserById(foundUser.id, {
  password: newPassword,
});

if (updateError) {
  throw new Error(updateError.message);
}

console.log(`Password updated for ${targetEmail} (userId=${foundUser.id})`);
