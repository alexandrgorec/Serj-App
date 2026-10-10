import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { useState, useEffect, createContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import OrderEditor from "./OrderEditor";
import FooterApp from './FooterApp';
import AllOrders from './AllOrders';
import Mailings from './Mailings';
import MailingEditor from './MailingEditor';
import Login from './Login';
import axios from 'axios';
import Menu from './Menu';
import AddUser from './AddUser';
import DeleteUser from './DeleteUser';
import ChangePassword from './ChangePassword';
import Header from './Header';
import AlertMessage from './AlertMessage';
import AuditLog from './AuditLog';
import { getApiBaseUrl } from './apiBaseUrl';
import { createEmptyOrder } from './orderDefaults';



export const userContext = createContext();

function createEmptyEditingOrder() {
  return {
    suppliers: [],
    buyers: [],
  };
}

const NEW_ORDER_DRAFT_PREFIX = 'serjApp:newOrderDraft:';

function getNewOrderDraftKey(user) {
  const rawKey = user?.id || user?.userId || user?.name;
  if (!rawKey) return '';
  return `${NEW_ORDER_DRAFT_PREFIX}${encodeURIComponent(String(rawKey))}`;
}

function readNewOrderDraft(storageKey, managerName = '') {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const defaults = createEmptyOrder({ manager: managerName });
    return {
      ...defaults,
      ...parsed,
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : defaults.suppliers,
      buyers: Array.isArray(parsed.buyers) ? parsed.buyers : defaults.buyers,
    };
  } catch (error) {
    return null;
  }
}

function writeNewOrderDraft(storageKey, order) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(order));
  } catch (error) {
    // Если браузер запретил запись, просто оставляем черновик в памяти приложения.
  }
}

function releaseOrderLockBestEffort({ apiBaseUrl, token, orderId }) {
  if (!orderId || !token) return;
  const url = `${apiBaseUrl}/user/releaseorderlock?token=${encodeURIComponent(token)}&id=${encodeURIComponent(orderId)}`;
  const payload = JSON.stringify({ id: orderId });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch (error) {
    // Best-effort release: if beacon is unavailable, fall back to keepalive fetch.
  }

  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch (error) {
    // Closing the page may interrupt this request; admin can release stale locks manually.
  }
}

function getStoredAccessToken() {
  return window.localStorage.accessToken || window.localStorage.token;
}

function storeAuthTokens(tokens) {
  const accessToken = tokens?.accessToken || tokens;
  if (!accessToken) return '';
  window.localStorage.token = accessToken;
  window.localStorage.accessToken = accessToken;
  delete window.localStorage.refreshToken;
  return accessToken;
}

function removeAuthTokens() {
  delete window.localStorage.token;
  delete window.localStorage.accessToken;
  delete window.localStorage.refreshToken;
}

function attachTokenToRequestConfig(config, accessToken) {
  const nextConfig = { ...config };
  let data = nextConfig.data || {};
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (error) {
      data = {};
    }
  }
  nextConfig.data = {
    ...data,
    token: accessToken,
  };
  return nextConfig;
}

function App() {
  const apiBaseUrl = getApiBaseUrl();
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('info');
  const setToast = (message, variant = 'info') => {
    setToastVariant(variant);
    setMessage(message);
    setShowMessage(true);
  }
  const [token, setToken] = useState(getStoredAccessToken());
  const skipNewOrderDraftPersistRef = useRef(false);
  const refreshTokenPromiseRef = useRef(null);

  const [editingOrder, setEditingOrder] = useState(createEmptyEditingOrder());
  const [orderEditLock, setOrderEditLock] = useState(null);

  const [user, setUser] = useState({
    name: '',
    rights: {},
  })
  const [newOrder, setNewOrder] = useState(createEmptyOrder());
  const newOrderDraftKey = getNewOrderDraftKey(user);
  const newOrderDraftManagerName = user?.name || '';

  const resetVolatileState = () => {
    const currentDraftKey = getNewOrderDraftKey(user);
    if (currentDraftKey) window.localStorage.removeItem(currentDraftKey);
    setEditingOrder(createEmptyEditingOrder());
    setOrderEditLock(null);
    setNewOrder(createEmptyOrder());
    setUser({
      name: '',
      rights: {},
    });
    setShowMessage(false);
    setMessage('');
    delete sessionStorage.createdOrderId;
    delete sessionStorage.bgColor;
  };

  const logOut = () => {
    if (orderEditLock?.isOwner && orderEditLock?.orderId) {
      releaseOrderLockBestEffort({ apiBaseUrl, token, orderId: orderEditLock.orderId });
    }
    axios.post(`${apiBaseUrl}/guest/logout`, {}, { withCredentials: true }).catch(() => {});
    removeAuthTokens();
    resetVolatileState();
    setToken(null);
  }

  const refreshAccessToken = () => {
    if (!refreshTokenPromiseRef.current) {
      refreshTokenPromiseRef.current = axios.post(`${apiBaseUrl}/guest/refreshToken`, {}, { withCredentials: true })
        .then((response) => {
          if (response.status !== 202) throw new Error('Refresh token rejected');
          const accessToken = storeAuthTokens(response.data);
          if (!accessToken) throw new Error('Refresh response without access token');
          setToken(accessToken);
          return accessToken;
        })
        .finally(() => {
          refreshTokenPromiseRef.current = null;
        });
    }
    return refreshTokenPromiseRef.current;
  };

  const aAxios = axios.create();
  aAxios.defaults.baseURL = apiBaseUrl;
  aAxios.defaults.withCredentials = true;
  aAxios.interceptors.request.use((config) => {
    return attachTokenToRequestConfig(config, getStoredAccessToken());
  }, (error) => {
    return Promise.reject(error);
  });

  aAxios.interceptors.response.use((config) => {
    return Promise.resolve(config);
  }, async (error) => {
    const originalRequest = error?.config;
    if (error?.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        return aAxios(attachTokenToRequestConfig(originalRequest, accessToken));
      } catch (refreshError) {
        logOut();
      }
    }
    else if (error?.response?.status === 401) {
      logOut();
    }
    if (error?.response?.status === 403) {

    }
    if (error?.code === "ERR_NETWORK") {
      setToast('Нет соединения с сервером')
    }
    return Promise.reject(error);
  })

  useEffect(() => {
    if (token)
      aAxios.post(`/user/getData`)
        .then((response) => {
          if (response.status === 202) {
            setUser(response.data.user);

          }
        })
        .catch((error) => {

        })
  }, [token]);

  useEffect(() => {
    if (!newOrderDraftKey) return;
    const draft = readNewOrderDraft(newOrderDraftKey, newOrderDraftManagerName);
    skipNewOrderDraftPersistRef.current = true;
    setNewOrder(draft || createEmptyOrder({ manager: newOrderDraftManagerName }));
  }, [newOrderDraftKey, newOrderDraftManagerName]);

  useEffect(() => {
    if (!newOrderDraftKey) return;
    if (skipNewOrderDraftPersistRef.current) {
      skipNewOrderDraftPersistRef.current = false;
      return;
    }
    writeNewOrderDraft(newOrderDraftKey, newOrder);
  }, [newOrderDraftKey, newOrder]);

  useEffect(() => {
    const setAppHeight = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
    };

    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    window.visualViewport?.addEventListener('resize', setAppHeight);
    window.visualViewport?.addEventListener('scroll', setAppHeight);

    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
      window.visualViewport?.removeEventListener('resize', setAppHeight);
      window.visualViewport?.removeEventListener('scroll', setAppHeight);
    };
  }, []);
  let size = '';
  let display = '';
  if (window.innerWidth < 850) {
    display = 'none';
    size = 'sm';
  }
  return (
    <userContext.Provider value={{ user, logOut, setUser, apiBaseUrl, setToast, aAxios, editingOrder, setEditingOrder, orderEditLock, setOrderEditLock, size, display }}>
      <BrowserRouter>
        {!token && <Login setToken={setToken} />}
        {token && <div className='appViewport'>
          <AlertMessage showMessage={showMessage} setShowMessage={setShowMessage} toastVariant={toastVariant} message={message} />
          <div className='app' >
            <Header />
            <section className='content'>
              <Routes>
                <Route path='/neworder' element={<OrderEditor mode="new" order={newOrder} setOrder={setNewOrder} />}></Route>
                <Route path='/allorders' element={<AllOrders />}></Route>
                <Route path='/editorder' element={<OrderEditor mode="edit" />}></Route>
                <Route path='/menu' >
                  <Route path='/menu' element={<Menu />}></Route>
                  {user.rights.adminAccess && <Route path='/menu/adduser' element={<AddUser />}></Route>}
                  {user.rights.adminAccess && <Route path='/menu/deleteuser' element={<DeleteUser />}></Route>}
                  {user.rights.adminAccess && <Route path='/menu/auditlog' element={<AuditLog />}></Route>}
                  <Route path='/menu/changepassword' element={<ChangePassword />}></Route>
                  <Route path='/menu/profile' element={'profile'}></Route>
                </Route>
                <Route path='/mailing' element={<Mailings />}></Route>
                <Route path='/mailing/new' element={<MailingEditor mode="new" />}></Route>
                <Route path='/mailing/edit/:id' element={<MailingEditor mode="edit" />}></Route>
                <Route path='/*' element={<Navigate to="/allorders" replace />}></Route>
              </Routes>
            </section>
            <FooterApp />
          </div>
        </div>}
      </BrowserRouter>
    </userContext.Provider>
  );
}

export { App as default };
