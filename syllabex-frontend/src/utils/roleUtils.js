import { ROLES, ROUTES } from './constants.js'

export const getHomeRoute = (role) => {
  switch (role) {
    case ROLES.ADMIN:   return ROUTES.ADMIN_DASH
    case ROLES.FACULTY: return ROUTES.FACULTY_DASH
    case ROLES.STUDENT: return ROUTES.CHAT
    default:            return ROUTES.LOGIN
  }
}

export const canAccess = (role, allowedRoles) =>
  allowedRoles.includes(role)

export const getRoleBadgeStyle = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return 'bg-crimson-50 text-crimson-700 border border-crimson-200'
    case ROLES.FACULTY:
      return 'bg-orange-50 text-orange-700 border border-orange-200'
    case ROLES.STUDENT:
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200'
  }
}

export const getRoleLabel = (role) => {
  switch (role) {
    case ROLES.ADMIN:   return 'Administrator'
    case ROLES.FACULTY: return 'Faculty'
    case ROLES.STUDENT: return 'Student'
    default:            return 'Unknown'
  }
}
