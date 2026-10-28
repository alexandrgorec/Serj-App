import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form, FloatingLabel, Stack } from 'react-bootstrap';
import { userContext } from './App';

export default function OrderEditSettings() {
  const { user, setUser, aAxios, setToast } = useContext(userContext);
  const [minutes, setMinutes] = useState(String(user?.orderEditMinutes ?? 20));
  const [saving, setSaving] = useState(false);
  const save = async (event) => {
    event.preventDefault();
    if (!/^\d+$/.test(minutes.trim()) || Number(minutes) < 1) {
      setToast('Введите целое положительное число минут', 'warning');
      return;
    }
    setSaving(true);
    try {
      const response = await aAxios.post('/user/ordereditsettings', { editMinutes: minutes });
      if (response.status !== 202) throw new Error('Не удалось сохранить настройку');
      setUser(current => ({ ...current, orderEditMinutes: response.data.editMinutes }));
      setMinutes(String(response.data.editMinutes));
      setToast('Время редактирования сохранено. Настройка применится при следующем открытии заявки.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Не удалось сохранить настройку', 'danger');
    } finally { setSaving(false); }
  };
  return (
    <div className="col-md-5 mx-auto mt-4 px-2">
      <Link to="/menu"><Button variant="outline-primary" className="w-100 mb-3">Назад</Button></Link>
      <h4>Время редактирования заявки</h4>
      <p>Время отсчитывается от открытия заявки. По истечении заданного времени заявка автоматически сохраняется и закрывается без дополнительного ожидания. По умолчанию — 20 минут.</p>
      <Form onSubmit={save}>
        <Stack gap={3}>
          <FloatingLabel controlId="order-edit-minutes" label="Время в минутах">
            <Form.Control type="text" inputMode="numeric" value={minutes} disabled={saving}
              onChange={event => setMinutes(event.target.value)} />
          </FloatingLabel>
          <Button type="submit" disabled={saving}>{saving ? 'Сохраняем...' : 'Сохранить'}</Button>
        </Stack>
      </Form>
    </div>
  );
}
