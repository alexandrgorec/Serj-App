import Button from 'react-bootstrap/Button';
import { useState, useContext, useEffect } from 'react';
import { userContext } from './App';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';
import Modal from 'react-bootstrap/Modal';
import { MdDelete } from "react-icons/md";
import { Link } from 'react-router-dom';



function DeleteUser() {
    const { aAxios } = useContext(userContext);
    const [users, setUsers] = useState([]);

    const [deletingUser, setDeletingUser] = useState(null);
    const [show, setShow] = useState(false);
    const handleCloseModal = () => setShow(false);
    const handleShowModal = () => setShow(true);

    const deleteUser = (userId) => {
        aAxios.post(`/admin/deleteuser`, {
            deleteUser: {
                id: userId,
            },
        })
            .then((response) => {
                if (response.status === 202) {
                    aAxios.post(`/admin/getListUsers`)
                        .then((response) => {
                            if (response.status === 202) {
                                setUsers(response.data.users);
                            }
                        })
                        .catch((error) => {
                       
                        })
                }
            })
            .catch((error) => {
                
            })

    }

    useEffect(() => {
        aAxios.post(`/admin/getListUsers`)
            .then((response) => {
                if (response.status === 202) {
                    setUsers(response.data.users);
                }
            })
            .catch((error) => {
               
            })
    }, []);
    return (
        <>
            <Link className="col-md-4 mt-4 mx-auto d-grid nodecoration" to='/menu'>
                <Button variant="outline-primary" size="lg">
                    Назад
                </Button>
            </Link>
            <div className="col-md-4 mx-auto">
                <br />
                <Table className='noselect' striped bordered hover responsive="sm">
                    <thead>
                        <tr>
                            <th>Login</th>
                            <th>Админ</th>
                            <th>Фин. блок</th>
                            <th>Имя</th>
                        </tr>
                        {
                            users.map(user => {
                                return (
                                    <tr key={user.id}>
                                        <td>{user.login}</td>
                                        <td>{user.rights.adminAccess ? "ДА" : ""}</td>
                                        <td>{user.rights.finBlockAccess ? "ДА" : ""}</td>
                                        <td>
                                            <Stack gap={1} direction='horizontal'>
                                                {user.userinfo.name}
                                                <MdDelete size='1.7em' className='icon ms-auto' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {
                                                    setDeletingUser({
                                                        id: user.id,
                                                        login: user.login,
                                                        name: user.userinfo.name,
                                                    })
                                                    handleShowModal();
                                                }}
                                                />
                                            </Stack>
                                        </td>
                                    </tr>
                                )
                            })
                        }
                    </thead>
                </Table>
                {deletingUser && <Modal centered show={show} onHide={handleCloseModal} animation={true} >
                    <Modal.Header closeButton>
                        <Modal.Title>Подтверждение удаления пользователя {deletingUser.name}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>Точно удаляем?</Modal.Body>
                    <Modal.Footer>

                        <Button variant="secondary" onClick={handleCloseModal}>
                            Еще подумаю
                        </Button>
                        <Button variant="primary" className='col-3' onClick={() => {
                            if (deletingUser)
                                deleteUser(deletingUser.id);
                            handleCloseModal();
                        }}>
                            Да
                        </Button>

                    </Modal.Footer>
                </Modal>}
            </div>
        </>
    )
}




export default DeleteUser;