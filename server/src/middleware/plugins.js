/**
 * Block feature when workspace has plugin disabled.
 * Legacy projects (no workspace on req) allow all features.
 */
export function requirePlugin(flagName) {
  return (req, res, next) => {
    const ws = req.workspace;
    if (!ws) return next();
    const plugins = ws.plugins || {};
    if (plugins[flagName] === false) {
      return res.status(403).json({ message: `Feature "${flagName}" is disabled for this workspace` });
    }
    next();
  };
}
