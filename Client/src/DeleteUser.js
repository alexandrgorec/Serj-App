import Button from 'react-bootstrap/Button';
import { useState, useContext, useEffect, useCallback } from 'react';
import { userContext } from './App';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { MdDelete } from "react-icons/md";
import { Link } from 'react-router-dom';



function DeleteUser() {
    const { aAxios, setToast } = useContext(userContext);
    const [users, setUsers] = useState([]);
    const [updatingRight, setUpdatingRight] = useState(null);

    const [deletingUser, setDeletingUser] = useState(null);
    const [show, setShow] = useState(false);
    const handleCloseModal = () => setShow(false);
    const handleShowModal = () => setShow(true);

    const loadUsers = useCallback(() => {
        aAxios.post(`/admin/getListUsers`)
            .then((response) => {
                if (response.status === 202) {
                    setUsers(response.data.users);
                }
            })
            .catch(() => {
                setToast('Не удалось загрузить список пользователей', 'danger');
            })
    }, [aAxios, setToast]);

    const deleteUser = (userId) => {
        aAxios.post(`/admin/deleteuser`, {
            deleteUser: {
                id: userId,
            },
        })
            .then((response) => {
                if (response.status === 202) {
                    loadUsers();
                }
            })
            .catch(() => {
                setToast('Не удалось удалить пользователя', 'danger');
            })

    }

    const updateUserRight = (targetUser, rightName, value) => {
        const updateKey = `${targetUser.id}-${rightName}`;
        const rightLabel = rightName === 'adminAccess' ? 'администраторские права' : 'бухгалтерские права';
        setUpdatingRight(updateKey);
        aAxios.post(`/admin/updateuserright`, {
            targetUserId: targetUser.id,
            rightName,
            value,
        })
            .then((response) => {
                if (response.status === 202) {
                    const updatedUser = response.data?.user;
                    setUsers((currentUsers) => currentUsers.map((user) => (
                        user.id === targetUser.id
                            ? { ...user, rights: updatedUser?.rights || { ...user.rights, [rightName]: value } }
                            : user
                    )));
                    setToast(`${rightLabel} ${value ? 'включены' : 'выключены'} для пользователя ${targetUser.userinfo?.name || targetUser.login}`);
                }
            })
            .catch((error) => {
                setToast(error?.response?.data || `Не удалось изменить ${rightLabel}`, 'danger');
            })
            .finally(() => {
                setUpdatingRight(null);
            });
    };

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

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
                    </thead>
                    <tbody>
                        {
                            users.map(user => {
                                return (
                                    <tr key={user.id}>
                                        <td>{user.login}</td>
                                        <td>
                                            <Form.Check
                                                className='noselect'
                                                type="switch"
                                                id={`admin-right-${user.id}`}
                                                label=""
                                                checked={!!user.rights.adminAccess}
                                                disabled={updatingRight === `${user.id}-adminAccess`}
                                                onChange={(evt) => updateUserRight(user, 'adminAccess', evt.target.checked)}
                                            />
                                        </td>
                                        <td>
                                            <Form.Check
                                                className='noselect'
                                                type="switch"
                                                id={`fin-right-${user.id}`}
                                                label=""
                                                checked={!!user.rights.finBlockAccess}
                                                disabled={updatingRight === `${user.id}-finBlockAccess`}
                                                onChange={(evt) => updateUserRight(user, 'finBlockAccess', evt.target.checked)}
                                            />
                                        </td>
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
                    </tbody>
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
