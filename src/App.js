import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { useState, useEffect, createContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NewOrder from "./NewOrder";
import FooterApp from './FooterApp';
import AllOrders from './AllOrders';
import Login from './Login';
import axios from 'axios';
import Menu from './Menu';
import AddUser from './AddUser';
import DeleteUser from './DeleteUser';
import Header from './Header';
import AlertMessage from './AlertMessage';
import EditOrder from './EditOrder';


const date = new Date();
  let dd = date.getDate();
  if (dd < 10) dd = '0' + dd;
  let mm = date.getMonth() + 1;
  if (mm < 10) mm = '0' + mm;
  let yy = date.getFullYear();
  if (yy < 10) yy = '0' + yy;

export const userContext = createContext();


function App() {
  const PORT = 3001;
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('info');
  const setToast = (message, variant = 'info') => {
    setToastVariant(variant);
    setMessage(message);
    setShowMessage(true);
  }
  const [token, setToken] = useState(window.localStorage.token);

  const [editingOrder, setEditingOrder] = useState({
    suppliers: [],
    buyers: [],
  });

  const [user, setUser] = useState({
    name: '',
    rights: {},
  })
  const logOut = () => {
    delete window.localStorage.token;
    setToken(null);
  }

  const aAxios = axios.create();
  aAxios.defaults.baseURL = `http://${window.location.hostname}:${PORT}`;
  aAxios.interceptors.request.use((config) => {
    config.data = config.data || {};
    config.data.token = token;
    return config;
  }, (error) => {
    return Promise.reject(error);
  });

  aAxios.interceptors.response.use((config) => {
    return Promise.resolve(config);
  }, (error) => {
    if (error?.response?.status === 401) {
      logOut();
    }
    if (error?.response?.status === 403) {

    }
    if (error?.code === "ERR_NETWORK") {
      setToast('Нет соединения с сервером')
    }
  })

  const [newOrder, setNewOrder] = useState({
    suppliers: [],
    buyers: [],
    date: yy + '-' + mm + '-' + dd,
  });



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
  let size = '';
  let display = '';
  if (window.innerWidth < 850) {
    display = 'none';
    size = 'sm';
  }

  const height = (window.innerHeight / window.outerHeight) > 0.85 ? 100 : 89.7;
  return (
    <userContext.Provider value={{ user, logOut, setUser, PORT, setToast, aAxios, editingOrder, setEditingOrder, size, display }}>
      <BrowserRouter>
        {!token && <Login setToken={setToken} />}
        {token && <div style={{ height: `${height}vh` }}>
          <AlertMessage showMessage={showMessage} setShowMessage={setShowMessage} toastVariant={toastVariant} message={message} />
          <div className='app' >
            <Header />
            <section className='content'>
              <Routes>
                <Route path='/neworder' element={<NewOrder order={newOrder} setOrder={setNewOrder} />}></Route>
                <Route path='/allorders' element={<AllOrders />}></Route>
                <Route path='/editorder' element={<EditOrder />}></Route>
                <Route path='/menu' >
                  <Route path='/menu' element={<Menu />}></Route>
                  {user.rights.adminAccess && <Route path='/menu/adduser' element={<AddUser />}></Route>}
                  {user.rights.adminAccess && <Route path='/menu/deleteuser' element={<DeleteUser />}></Route>}
                  <Route path='/menu/profile' element={'profile'}></Route>
                </Route>
                <Route path='/warehouse' element={'Компонент не создан'}></Route>
                <Route path='/*' element={<AllOrders />}></Route>
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



