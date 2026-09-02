import type { WorkingCopyChange } from '../domain/change';
import type { SvnRevision } from '../domain/revision';
import type { RecentItem } from '../features/welcome/WelcomeScreen';

export const fixtureRecents: RecentItem[] = [
  {
    name: 'frontend-web',
    path: '~/work/frontend-web',
    absolutePath: '/Users/dev/work/frontend-web',
    revision: 18427,
    statusLabel: 'Up to date',
    statusTone: 'ok',
  },
  {
    name: 'admin-console',
    path: '~/work/admin-console',
    absolutePath: '/Users/dev/work/admin-console',
    revision: 9931,
    statusLabel: '3 local changes',
    statusTone: 'dirty',
  },
];

const fixtureRoot = '/Users/dev/work/frontend-web';

export const fixtureChanges: WorkingCopyChange[] = [
  { path: 'src/components/UserCard.vue', absolutePath: `${fixtureRoot}/src/components/UserCard.vue`, status: 'modified' },
  { path: 'src/api/user.ts', absolutePath: `${fixtureRoot}/src/api/user.ts`, status: 'modified' },
  { path: 'src/pages/profile.vue', absolutePath: `${fixtureRoot}/src/pages/profile.vue`, status: 'added' },
  { path: 'src/styles/profile.css', absolutePath: `${fixtureRoot}/src/styles/profile.css`, status: 'modified' },
  { path: 'public/legacy-avatar.png', absolutePath: `${fixtureRoot}/public/legacy-avatar.png`, status: 'deleted' },
  { path: 'README.md', absolutePath: `${fixtureRoot}/README.md`, status: 'modified' },
];

export const fixtureCheckedPaths = fixtureChanges.map((change) => change.path);

export const fixturePatch = `diff --git a/src/components/UserCard.vue b/src/components/UserCard.vue
index 1111111..2222222 100644
--- a/src/components/UserCard.vue
+++ b/src/components/UserCard.vue
@@ -18,12 +18,12 @@
 const avatar = computed(() => {
   if (props.user.avatar) return props.user.avatar
-  return '/images/default-avatar.png'
+  return getAvatarFallback(props.user.name)
 })
 
 const displayName = computed(() => {
-  return props.user.nickname || props.user.name
+  return props.user.displayName ?? props.user.name
 })
 
 function handleOpenProfile() {
-  router.push('/profile/' + props.user.id)
+  router.push({ name: 'profile', params: { id: props.user.id } })
 }
`;

export const fixtureHistory: SvnRevision[] = [
  {
    revision: 18431,
    author: 'alice',
    date: '2026-09-01T23:18:00.000Z',
    message: 'Fix profile avatar fallback when CDN is empty',
    changedPaths: [
      { action: 'M', path: '/trunk/src/components/UserCard.vue' },
      { action: 'M', path: '/trunk/src/api/user.ts' },
    ],
  },
  {
    revision: 18430,
    author: 'bob',
    date: '2026-08-31T10:00:00.000Z',
    message: 'Add profile page scaffold',
    changedPaths: [{ action: 'A', path: '/trunk/src/pages/profile.vue' }],
  },
  {
    revision: 18429,
    author: 'alice',
    date: '2026-08-30T09:00:00.000Z',
    message: 'Tighten user service timeouts',
    changedPaths: [{ action: 'M', path: '/trunk/src/api/user.ts' }],
  },
];
