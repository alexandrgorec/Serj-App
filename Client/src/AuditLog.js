import './AuditLog.css';
import { useContext, useEffect, useState } from 'react';
import { userContext } from './App';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { Link } from 'react-router-dom';

function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('ru-RU');
}

function formatDetails(payload) {
    if (payload === null || payload === undefined) return '—';
    if (typeof payload === 'string') return payload || '—';
    if (Array.isArray(payload?.changes)) {
        const lines = payload.changes.map((change) => {
            const field = change?.field || 'field';
            const before = change?.before ?? '∅';
            const after = change?.after ?? '∅';
            return `${field}: ${before} -> ${after}`;
        });
        if (payload?.truncated) {
            lines.push(`... и еще ${Math.max(0, (payload.totalChanges || 0) - (payload.shownChanges || 0))} изменений`);
        }
        return lines.length ? lines.join('\n') : '—';
    }
    try {
        const text = JSON.stringify(payload, null, 2);
        return text === '{}' ? '—' : text;
    } catch (error) {
        return '—';
    }
}

function AuditLog() {
    const { aAxios, setToast } = useContext(userContext);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [show, setShow] = useState(false);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const loadAuditLog = () => {
        aAxios.post('/admin/auditlog/list', { page, pageSize })
            .then((response) => {
                if (response.status === 202) {
                    setItems(response.data.items || []);
                    setTotal(response.data.total || 0);
                }
            })
            .catch(() => { });
    };

    useEffect(() => {
        loadAuditLog();
    }, [page, pageSize]);

    return (
        <div className='auditLogPage'>
            <div className='auditLogTopBar'>
                <div className='auditLogTopBarLeft'>
                    <Link className='nodecoration' to='/menu'>
                        <Button variant='outline-primary'>Назад</Button>
                    </Link>
                </div>
                <div className='auditLogTopBarCenter'>
                    <h5 className='auditLogTitle mb-0'>Журнал изменений БД</h5>
                </div>
                <Stack direction='horizontal' gap={2} className='auditLogTopBarRight'>
                    <Form.Select
                        className='auditLogPageSize'
                        value={String(pageSize)}
                        onChange={(evt) => {
                            const next = Number(evt.target.value) || 20;
                            setPageSize(next);
                            setPage(1);
                        }}
                    >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </Form.Select>
                    <Button variant='danger' onClick={() => setShow(true)}>
                        Очистить журнал
                    </Button>
                </Stack>
            </div>

            <div className='auditLogTableWrap'>
                <Table striped bordered hover responsive='sm' size='sm' className='auditLogTable'>
                    <thead>
                        <tr>
                            <th>Дата/время</th>
                            <th>Пользователь</th>
                            <th>Действие</th>
                            <th>Сущность</th>
                            <th>ID</th>
                            <th>Route</th>
                            <th>Детали</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 &&
                            <tr>
                                <td colSpan={7} className='text-center'>Журнал пуст</td>
                            </tr>
                        }
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td>{formatDateTime(item.created_at)}</td>
                                <td>{item.actor_name || item.actor_user_id || '—'}</td>
                                <td>{item.action || '—'}</td>
                                <td>{item.entity_type || '—'}</td>
                                <td>{item.entity_id || '—'}</td>
                                <td>{item.route || '—'}</td>
                                <td className='auditLogDetails'>{formatDetails(item.payload)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            <Stack direction='horizontal' gap={2} className='auditLogPager'>
                <Button
                    variant='outline-secondary'
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                    Назад
                </Button>
                <div className='auditLogPagerInfo'>
                    Страница {page} из {totalPages} • Всего записей: {total}
                </div>
                <Button
                    variant='outline-secondary'
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                    Вперед
                </Button>
            </Stack>

            <Modal centered show={show} onHide={() => setShow(false)} animation={true}>
                <Modal.Header closeButton>
                    <Modal.Title>Очистка журнала</Modal.Title>
                </Modal.Header>
                <Modal.Body>Удалить все записи журнала без возможности восстановления?</Modal.Body>
                <Modal.Footer>
                    <Button variant='secondary' onClick={() => setShow(false)}>
                        Отмена
                    </Button>
                    <Button
                        variant='danger'
                        onClick={() => {
                            aAxios.post('/admin/auditlog/clear')
                                .then((response) => {
                                    if (response.status === 202) {
                                        const deletedCount = response?.data?.deletedCount || 0;
                                        setToast(`Журнал очищен. Удалено записей: ${deletedCount}`);
                                        setShow(false);
                                        setPage(1);
                                        loadAuditLog();
                                    }
                                })
                                .catch(() => { });
                        }}
                    >
                        Очистить
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default AuditLog;
