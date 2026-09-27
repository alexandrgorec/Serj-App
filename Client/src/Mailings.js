import './Mailings.css';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';
import { BiEditAlt } from 'react-icons/bi';
import { MdContentCopy, MdDelete } from 'react-icons/md';
import { userContext } from './App';

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(Date.parse(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function employeeName(mailing) {
  return String(mailing?.employee_json?.name || mailing?.employee_json?.login || '').trim() || '—';
}

const COPIED_MAILING_CATEGORIES_KEY = 'copiedMailingCategories';

function getMailingCategories(mailing) {
  const saved = mailing?.categories_json;
  if (Array.isArray(saved)) return saved;
  return Array.isArray(saved?.categories) ? saved.categories : [];
}

function readCopiedMailingCategories() {
  try {
    const saved = window.sessionStorage.getItem(COPIED_MAILING_CATEGORIES_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed?.categories) ? parsed : null;
  } catch {
    return null;
  }
}

function clearCopiedMailingCategories() {
  window.sessionStorage.removeItem(COPIED_MAILING_CATEGORIES_KEY);
}

function MailingActions({ mailing, onCopy, onEdit, onDelete }) {
  return (
    <Stack direction="horizontal" gap={3} className="mailings-menuStack">
      <MdContentCopy
        size="1.45em"
        className="mailings-actionIcon"
        title="Скопировать категории для новой рассылки"
        aria-label="Скопировать"
        onClick={(event) => onCopy(event, mailing)}
      />
      <BiEditAlt
        size="1.6em"
        className="mailings-actionIcon mailings-editActionIcon"
        style={{ color: 'rgba(1, 87, 248, 0.85)' }}
        title="Изменить"
        aria-label="Изменить"
        onClick={() => onEdit(mailing)}
      />
      <MdDelete
        size="1.55em"
        className="mailings-actionIcon"
        style={{ color: 'rgb(194, 65, 65)' }}
        title="Удалить"
        aria-label="Удалить"
        onClick={() => onDelete(mailing)}
      />
    </Stack>
  );
}

function Mailings() {
  const { aAxios, setToast } = useContext(userContext);
  const navigate = useNavigate();
  const [mailings, setMailings] = useState([]);
  const [mailingForDelete, setMailingForDelete] = useState(null);
  const [copiedMailingDraft, setCopiedMailingDraft] = useState(null);

  const loadMailings = useCallback(() => {
    aAxios.post('/user/getallmailings')
      .then((response) => {
        if (response.status === 202) {
          setMailings(Array.isArray(response.data?.mailings) ? response.data.mailings : []);
        }
      })
      .catch(() => {
        setToast('Не удалось загрузить рассылки', 'danger');
      });
  }, [aAxios, setToast]);

  useEffect(() => {
    loadMailings();
  }, [loadMailings]);

  const deleteMailing = () => {
    if (!mailingForDelete) return;
    aAxios.post('/user/deletemailing', { id: mailingForDelete.id })
      .then((response) => {
        if (response.status === 202) {
          setToast(`Рассылка №${mailingForDelete.id} удалена`);
          setMailingForDelete(null);
          loadMailings();
        }
      })
      .catch(() => {
        setToast('Не удалось удалить рассылку', 'danger');
      });
  };

  const openMailingEditor = (mailing) => {
    navigate(`/mailing/edit/${mailing.id}`, { state: { mailing } });
  };

  const handleCopyMailing = (event, mailing) => {
    event.stopPropagation();
    const categories = JSON.parse(JSON.stringify(getMailingCategories(mailing)));
    window.sessionStorage.setItem(COPIED_MAILING_CATEGORIES_KEY, JSON.stringify({
      sourceId: mailing.id,
      copiedAt: new Date().toISOString(),
      categories,
    }));
    setToast(
      `Рассылка №${mailing.id} скопирована. Нажмите «Новая рассылка» и выберите заполнение скопированными значениями.`,
    );
  };

  const handleNewMailingClick = () => {
    const copiedDraft = readCopiedMailingCategories();
    if (copiedDraft) {
      setCopiedMailingDraft(copiedDraft);
      return;
    }
    navigate('/mailing/new');
  };

  const startBlankMailing = () => {
    clearCopiedMailingCategories();
    setCopiedMailingDraft(null);
    navigate('/mailing/new');
  };

  const startCopiedMailing = () => {
    const categories = copiedMailingDraft?.categories || [];
    clearCopiedMailingCategories();
    setCopiedMailingDraft(null);
    navigate('/mailing/new', { state: { copiedCategories: categories } });
  };

  return (
    <div className="mailings noselect">
      <div className="mailings-toolbar">
        <Button
          tabIndex={-1}
          className="mailings-newBtn"
          onClick={handleNewMailingClick}
        >
          Новая рассылка
        </Button>
      </div>

      {mailings.length === 0
        ? <div className="mailings-empty">Рассылки пока не созданы</div>
        : <>
          <div className="mailings-tableWrap">
            <Table className="mailings-table" striped bordered hover responsive="sm">
              <colgroup>
                <col className="mailings-col-id" />
                <col className="mailings-col-date" />
                <col className="mailings-col-employee" />
                <col className="mailings-col-menu" />
              </colgroup>
              <thead>
                <tr>
                  <th>Порядковый номер</th>
                  <th>Дата создания</th>
                  <th>Сотрудник</th>
                  <th>Меню</th>
                </tr>
              </thead>
              <tbody>
                {mailings.map((mailing) => (
                  <tr
                    key={mailing.id}
                    className="mailings-row"
                    onDoubleClick={() => openMailingEditor(mailing)}
                  >
                    <td className="mailings-cell-id">{mailing.id}</td>
                    <td className="mailings-cell-date">{formatDateTime(mailing.created_at)}</td>
                    <td>{employeeName(mailing)}</td>
                    <td className="mailings-cell-menu">
                      <MailingActions
                        mailing={mailing}
                        onCopy={handleCopyMailing}
                        onEdit={openMailingEditor}
                        onDelete={setMailingForDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="mailings-mobileCards">
            {mailings.map((mailing) => (
              <div className="mailings-card" key={mailing.id}>
                <div className="mailings-cardHeader">
                  <div className="mailings-cardTitle">Рассылка №{mailing.id}</div>
                  <MailingActions
                    mailing={mailing}
                    onCopy={handleCopyMailing}
                    onEdit={openMailingEditor}
                    onDelete={setMailingForDelete}
                  />
                </div>
                <button
                  type="button"
                  className="mailings-cardBody"
                  onClick={() => openMailingEditor(mailing)}
                >
                  <div className="mailings-cardRow">
                    <span className="mailings-cardLabel">Дата создания</span>
                    <span className="mailings-cardValue">{formatDateTime(mailing.created_at)}</span>
                  </div>
                  <div className="mailings-cardRow">
                    <span className="mailings-cardLabel">Сотрудник</span>
                    <span className="mailings-cardValue">{employeeName(mailing)}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </>
      }

      <Modal centered show={!!mailingForDelete} onHide={() => setMailingForDelete(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>Удалить рассылку №{mailingForDelete?.id}?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setMailingForDelete(null)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={deleteMailing}>
            Удалить
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal centered show={!!copiedMailingDraft} backdrop="static" keyboard={false}>
        <Modal.Header>
          <Modal.Title>Новая рассылка</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Есть скопированные категории из рассылки №{copiedMailingDraft?.sourceId}. Создать новую рассылку с нуля или заполнить ее скопированными значениями?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={startBlankMailing}>
            С нуля
          </Button>
          <Button variant="primary" onClick={startCopiedMailing}>
            Заполнить скопированными
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Mailings;
