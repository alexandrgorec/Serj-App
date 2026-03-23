import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

function AlertMessage({setShowMessage, showMessage, toastVariant, message}) {
    return(
        <ToastContainer
          className="p-3"
          position={'bottom-end'}
          style={{ zIndex: 1 }}
        >
          <Toast onClose={() => { setShowMessage(false) }} show={showMessage} delay={3500} autohide bg={toastVariant}>
            <Toast.Header>
              <strong className="me-auto text-black"><h4>Оповещение</h4></strong>
            </Toast.Header>
            <Toast.Body className='success'>
              {message}
            </Toast.Body>
          </Toast>
        </ToastContainer>
    )
}

export default AlertMessage;