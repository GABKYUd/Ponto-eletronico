const ROLES = {
    HR: 'HR',
    HRAssistant: 'HRAssistant',
    Employee: 'Employee',
    Infra: 'Infra',
    ITAnalyst: 'ITAnalyst',
    MasterAdmin: 'MasterAdmin',
    Vendors: 'Vendors',
    Merchandising: 'Merchandising'
};

const PERMISSIONS = {
    [ROLES.MasterAdmin]: ['*'],
    [ROLES.Infra]: ['VIEW_SECURITY_DASH', 'MANAGE_KEYS', 'VIEW_LOGS'],
    [ROLES.ITAnalyst]: ['VIEW_LOGS', 'REVOKE_SESSION'],
    [ROLES.HR]: ['MANAGE_INVITES', 'REVOKE_SESSION', 'VIEW_ALL_RECEIPTS', 'MANAGE_USERS', 'VIEW_PROFILES', 'SEND_GLOBAL_MAIL', 'VIEW_REPORTS'],
    [ROLES.HRAssistant]: ['VIEW_ALL_RECEIPTS', 'VIEW_PROFILES', 'SEND_GLOBAL_MAIL', 'VERIFY_RECEIPT_CODES', 'VIEW_REPORTS'],
    [ROLES.Employee]: ['VIEW_OWN_PROFILE', 'SUBMIT_RECEIPT', 'SEND_MAIL'],
    [ROLES.Vendors]: ['VIEW_OWN_PROFILE', 'SUBMIT_RECEIPT', 'SEND_MAIL'],
    [ROLES.Merchandising]: ['VIEW_OWN_PROFILE', 'SUBMIT_RECEIPT', 'SEND_MAIL']
};

/**
 * Checks if a specific role has a given permission action.
 */
function hasPermission(role, action) {
    if (!PERMISSIONS[role]) return false;
    if (PERMISSIONS[role].includes('*')) return true;
    return PERMISSIONS[role].includes(action);
}

module.exports = {
    ROLES,
    PERMISSIONS,
    hasPermission
};
