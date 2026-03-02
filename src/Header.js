import { Stack } from "react-bootstrap";
import { useContext } from "react";
import { userContext } from "./App";
import { MdLogout } from "react-icons/md";
import { FaCircleUser } from "react-icons/fa6";

function Header() {
    const { logOut, user } = useContext(userContext);
    return (
        <Stack direction="horizontal" gap={3} className='activeComponentHeader'>
            <Stack style={{ userSelect: 'none', cursor: 'pointer' }} direction="horizontal" gap={1}><div className='logo'></div>Santo</Stack >
            <div className='p-2 ms-auto noselect' style={{ cursor: 'pointer' }}>{user.name}  <FaCircleUser style={{ paddingBottom: '2px' }} size={'1.5em'} /></div>
            <div onClick={logOut} className="p-2 noselect" style={{ cursor: 'pointer' }}><MdLogout style={{ paddingBottom: '2px' }} size={'1.5em'} className='icon ms-auto' />Выход</div>
        </Stack>
    )
}

export default Header;