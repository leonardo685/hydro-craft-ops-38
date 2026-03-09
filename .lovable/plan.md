

## Plan: Add "Compras" to Menu Permissions

The sidebar already references `permission: "compras"`, but the AdminPermissions page doesn't list it as a configurable menu item, and the database likely lacks `menu_permissions` rows for it.

### Changes

1. **`src/pages/AdminPermissions.tsx`** (line 71-83)
   - Add `{ id: 'compras', label: 'Compras' }` to the `menuItems` array so it appears in the permissions table.

2. **Database migration**
   - Insert `menu_permissions` rows for `compras` for roles `gestor` and `operador` (with `can_access = false` by default), so they can be toggled by the admin.

This will allow admins to enable/disable "Compras" access per role from the Permissions tab.

