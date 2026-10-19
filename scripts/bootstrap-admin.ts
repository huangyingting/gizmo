import { bootstrapAdminAccount } from '../src/lib/account-admission';

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (item === '--email' && argv[i + 1]) {
      args.email = argv[++i];
    } else if (item === '--password' && argv[i + 1]) {
      args.password = argv[++i];
    } else if (item === '--name' && argv[i + 1]) {
      args.name = argv[++i];
    }
  }
  return args;
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const email = cli.email || process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@gizmo.local';
  const password = cli.password || process.env.BOOTSTRAP_ADMIN_PASSWORD || 'AdminPassword123!';
  const name = cli.name || process.env.BOOTSTRAP_ADMIN_NAME || 'Jack Huang';

  const result = await bootstrapAdminAccount({ email, password, name });
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: result.created ? 'created' : 'updated',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          handle: result.user.handle,
          role: result.user.role,
          status: result.user.status,
        },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('[bootstrap:admin] Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
