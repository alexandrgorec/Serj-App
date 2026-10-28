import { useContext } from "react";
import { userContext } from "./App";
import { MdLogout } from "react-icons/md";
import { FaCircleUser } from "react-icons/fa6";

function Header({ timerRef }) {
    const { logOut, user } = useContext(userContext);
    return (
        <header className="activeComponentHeader">
            <div className="header-brand"><div className="logo" /><span className="header-brandName">Santo</span></div>
            <div ref={timerRef} className="header-timerSlot" />
            <div className="header-account">
                <div className="header-user" title={user.name}>
                    <span className="header-userName">{user.name}</span><FaCircleUser size="1.5em" />
                </div>
                <button type="button" onClick={logOut} className="header-logout" aria-label="Выход" title="Выход">
                    <MdLogout size="1.5em" /><span className="header-logoutText">Выход</span>
                </button>
            </div>
        </header>
    )
}

export default Header;
