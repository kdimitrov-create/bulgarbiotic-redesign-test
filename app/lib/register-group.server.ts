import {adminGql, adminOrigin, adminPat} from './admin-api.server';

/**
 * Клиентска група за клиент, регистриран от формата /account/register.
 *
 * Защо изобщо е нужно: `customerCreate` от Storefront API-то няма поле за
 * група и платформата не задава такава. От превключването към Nitrogen
 * (18.08.2026) всеки регистриран от витрината клиент оставаше с група 0, тоест
 * без група. Преди това класическата регистрация ги слагаше в група.
 *
 * Правилата, за да не счупи нищо друго:
 *   • пипа само клиент с точно този имейл и само ако е БЕЗ група - група,
 *     сложена от платформата или от търговеца, никога не се презаписва;
 *   • групата се търси по име („Default"), не по номер, защото номерата на
 *     тестовия и на живия магазин не са гарантирано едни и същи;
 *   • върви във фона през `waitUntil` и никога не хвърля: регистрацията и
 *     кодът за вход тръгват както досега, дори Admin API-то да падне.
 *
 * SERVER ONLY: `.server.ts` пази PAT-а извън клиентския бъндъл.
 */

const TARGET_GROUP_NAME = 'Default';

const FIND_CUSTOMER = `query FindRegistered($email: String!) {
  customers(first: 5, email: $email) { edges { node { id email groupId } } }
}`;

const FIND_GROUP = `query FindGroup($name: String!) {
  customerGroups(first: 10, name: $name) { edges { node { id name } } }
}`;

const CHANGE_GROUP = `mutation SetGroup($id: ID!, $groupId: ID!) {
  changeCustomerGroup(id: $id, groupId: $groupId) { id groupId }
}`;

type CustomerRow = {id: string; email: string | null; groupId: string | null};
type GroupRow = {id: string; name: string};

/** Без група = няма номер или номерът е 0. */
function hasNoGroup(groupId: string | null | undefined): boolean {
  return !groupId || groupId === '0';
}

async function findCustomer(origin: string, pat: string, email: string): Promise<CustomerRow | null> {
  const data = await adminGql<{customers: {edges: Array<{node: CustomerRow}>}}>(origin, pat, FIND_CUSTOMER, {
    email,
  });
  const wanted = email.toLowerCase();
  return data?.customers.edges.map((e) => e.node).find((c) => c.email?.toLowerCase() === wanted) ?? null;
}

async function findGroupId(origin: string, pat: string): Promise<string | null> {
  const data = await adminGql<{customerGroups: {edges: Array<{node: GroupRow}>}}>(origin, pat, FIND_GROUP, {
    name: TARGET_GROUP_NAME,
  });
  return data?.customerGroups.edges.find((e) => e.node.name === TARGET_GROUP_NAME)?.node.id ?? null;
}

/**
 * Слага новорегистрирания клиент в група Default, ако е останал без група.
 * Извиква се след успешна регистрация; не чака и не хвърля.
 */
export function assignRegisteredCustomerGroup(env: Record<string, string | undefined>, email: string): void {
  const origin = adminOrigin(env);
  const pat = adminPat(env);
  if (!origin || !pat) return;

  const work = (async () => {
    // Клиентът обикновено е там веднага; кратко изчакване, ако записът закъснее.
    let customer: CustomerRow | null = null;
    for (let attempt = 0; attempt < 4 && !customer; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 1500));
      customer = await findCustomer(origin, pat, email).catch(() => null);
    }
    if (!customer) {
      console.error('регистрация: клиентът не се намери за група:', email);
      return;
    }
    if (!hasNoGroup(customer.groupId)) return;

    const groupId = await findGroupId(origin, pat);
    if (!groupId) {
      console.error(`регистрация: няма група „${TARGET_GROUP_NAME}" в магазина`);
      return;
    }
    await adminGql(origin, pat, CHANGE_GROUP, {id: customer.id, groupId});
  })().catch((error) => console.error('регистрация: групата не се сложи -', (error as Error).message));

  const waitUntil = (env as any).__waitUntil;
  if (typeof waitUntil === 'function') waitUntil(work);
}
