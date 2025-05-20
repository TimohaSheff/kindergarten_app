import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';

// Ленивая загрузка компонентов
const Login = lazy(() => import('./pages/Login'));
const Welcome = lazy(() => import('./pages/Welcome'));
const Home = lazy(() => import('./pages/Home'));
const ChildrenList = lazy(() => import('./pages/ChildrenList'));
const Groups = lazy(() => import('./pages/Groups'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Progress = lazy(() => import('./pages/Progress'));
const Services = lazy(() => import('./pages/Services'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const Menu = lazy(() => import('./pages/Menu'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));

// Компонент загрузки
const LoadingFallback = () => <div>Загрузка...</div>;

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* Публичные маршруты */}
      <Route path="/" element={
        <Suspense fallback={<LoadingFallback />}>
          <Home />
        </Suspense>
      } />
      <Route path="/login" element={
        <Suspense fallback={<LoadingFallback />}>
          <Login />
        </Suspense>
      } />
      <Route path="/contacts" element={
        <Suspense fallback={<LoadingFallback />}>
          <Contacts />
        </Suspense>
      } />

      {/* Защищенные маршруты */}
      <Route element={<Layout />}>
        <Route path="/welcome" element={
          <Suspense fallback={<LoadingFallback />}>
            <Welcome />
          </Suspense>
        } />
        <Route path="/children/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <ChildrenList />
          </Suspense>
        } />
        <Route path="/groups/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <Groups />
          </Suspense>
        } />
        <Route path="/schedule/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <Schedule />
          </Suspense>
        } />
        <Route path="/attendance/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <Attendance />
          </Suspense>
        } />
        <Route path="/progress/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <Progress />
          </Suspense>
        } />
        <Route path="/services/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <Services />
          </Suspense>
        } />
        <Route path="/recommendations/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <Recommendations />
          </Suspense>
        } />
        <Route path="/menu/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <Menu />
          </Suspense>
        } />
        <Route path="/users/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <Users />
          </Suspense>
        } />
        <Route path="/profile/*" element={
          <Suspense fallback={<LoadingFallback />}>
            <Profile />
          </Suspense>
        } />
      </Route>

      {/* Перенаправление неизвестных маршрутов */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_normalizeFormMethod: true
    }
  }
); 