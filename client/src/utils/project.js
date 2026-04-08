export function getProjectRole(project, user) {
  const userId = user?.id || user?._id;
  if (!project?.members || !userId) return null;
  const m = project.members.find((x) => String(x.user?._id || x.user) === String(userId));
  return m?.role || null;
}
