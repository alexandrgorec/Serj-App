import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import "./Login.css";
import axios from 'axios';
import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-bootstrap';

const PORT = window.location.port === '3000' ? 3001 : window.location.port;





function Login({ setAuth }) {
    const refUser = useRef(null);
    const refPassword = useRef(null);
    const [alert, setAlert] = useState("");
    const [u, setUserName] = useState('');
    const [p, setUserPassword] = useState('');

    const handleBtnClick = (evt) => {
        evt.preventDefault();
        if (refPassword.current.value === '' || refUser.current.value === '') {
            if (refPassword.current.value === '')
                refPassword.current.focus();
            if (refUser.current.value === '')
                refUser.current.focus();
        }
        else {
            axios.post(`http://${window.location.hostname}:${PORT}/auth`, {
                u,
                p,
            })
                .then(function (response) {
                    if (response.data === 'авторизован') {
                        setAuth(true);
                    }
                    else {
                        setAlert(response.data);
                    }
                })
        }
    }

    useEffect(() => {
        refUser.current.focus();
    },[false])
    return (
        <div className='loginContainer'>

            <div className='loginForm'>
                <Form>
                    <Form.Group className="mb-3" controlId="formBasicEmail">
                        <h1><Form.Label className='h1'>Авторизация</Form.Label></h1>
                        <Form.Label>Логин (123)</Form.Label>
                        <Form.Control type="text" placeholder="Логин" ref={refUser} onChange={(evt) => setUserName(evt.target.value)} />
                        <Form.Text className="text-muted">
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formBasicPassword">
                        <Form.Label>Пароль (123)</Form.Label>
                        <Form.Control type="password" placeholder="Пароль" ref={refPassword} onChange={(evt) => setUserPassword(evt.target.value)} />
                    </Form.Group>
                    <div className="d-grid gap-2">
                        <Button variant="primary" size="lg" type="submit" onClick={handleBtnClick}>
                            Войти
                        </Button>
                        <center>
                            {alert != ""
                                ? <Alert key='danger' variant='danger'> {alert} </Alert>
                                : ""
                            }
                        </center>
                    </div>
                </Form>
            </div>
        </div >
    )
}

export default Login;

