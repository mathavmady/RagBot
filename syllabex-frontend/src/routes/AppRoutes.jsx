import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES, ROLES } from '../utils/constants.js'
import ProtectedRoute from './ProtectedRoute.jsx'

import Login         from '../pages/auth/Login.jsx'
import SetPassword   from '../pages/auth/SetPassword.jsx'
import ChatPage      from '../pages/student/ChatPage.jsx'
import FacultyDashboard  from '../pages/faculty/FacultyDashboard.jsx'
import UploadMaterials   from '../pages/faculty/UploadMaterials.jsx'
import AdminDashboard    from '../pages/admin/AdminDashboard.jsx'
import ManageFaculty     from '../pages/admin/ManageFaculty.jsx'
import ManageDocuments   from '../pages/admin/ManageDocuments.jsx'
import NotFound      from '../pages/common/NotFound.jsx'
import Unauthorized  from '../pages/common/Unauthorized.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path={ROUTES.LOGIN}        element={<Login />} />
      <Route path={ROUTES.SET_PASSWORD} element={<SetPassword />} />
      <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />
      <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />

      {/* Student */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.FACULTY, ROLES.ADMIN]} />}>
        <Route path={ROUTES.CHAT} element={<ChatPage />} />
      </Route>

      {/* Faculty */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.FACULTY, ROLES.ADMIN]} />}>
        <Route path={ROUTES.FACULTY_DASH} element={<FacultyDashboard />} />
        <Route path={ROUTES.UPLOAD}       element={<UploadMaterials />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route path={ROUTES.ADMIN_DASH}      element={<AdminDashboard />} />
        <Route path={ROUTES.MANAGE_FACULTY}  element={<ManageFaculty />} />
        <Route path={ROUTES.MANAGE_DOCS}     element={<ManageDocuments />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
