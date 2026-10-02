import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { userContext } from './App';

function ChangePassword() {
  const { aAxios, setToast } = useContext(userContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const changePassword = (evt) => {
    evt.preventDefault();

    if (!currentPassword.trim()) {
      setToast('Введите текущий пароль', 'warning');
      return;
    }

    if (!newPassword) {
      setToast('Введите новый пароль', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      setToast('Новый пароль и подтверждение не совпадают', 'warning');
      return;
    }

    setIsSaving(true);
    aAxios.post('/user/changepassword', {
      currentPassword,
      newPassword,
    })
      .then((response) => {
        if (response.status === 202) {
          resetForm();
          setToast('Пароль изменен');
        }
      })
      .catch((error) => {
        setToast(error?.response?.data || 'Не удалось изменить пароль', 'danger');
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <>
      <Link className="col-md-3 mt-4 mx-auto d-grid nodecoration" to="/menu">
        <Button variant="outline-primary" size="lg">
          Назад
        </Button>
      </Link>
      <Form className="col-md-3 mx-auto mt-4" onSubmit={changePassword}>
        <Stack gap={2}>
          <FloatingLabel label="Текущий пароль">
            <Form.Control
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(evt) => setCurrentPassword(evt.target.value)}
            />
          </FloatingLabel>
          <FloatingLabel label="Новый пароль">
            <Form.Control
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(evt) => setNewPassword(evt.target.value)}
            />
          </FloatingLabel>
          <FloatingLabel label="Повторите новый пароль">
            <Form.Control
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(evt) => setConfirmPassword(evt.target.value)}
            />
          </FloatingLabel>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-3 p-3"
            disabled={isSaving}
          >
            {isSaving ? 'Сохраняем...' : 'Сменить пароль'}
          </Button>
        </Stack>
      </Form>
    </>
  );
}

export default ChangePassword;
