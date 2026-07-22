import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { listMembers } from "./api";
export default function MembershipPage() {
    const [members, setMembers] = useState([]);
    useEffect(() => {
        listMembers().then(setMembers).catch(console.error);
    }, []);
    return (_jsxs("div", { children: [_jsx("h1", { children: "Membership" }), _jsx("ul", { children: members.map((m) => (_jsxs("li", { children: [m.Name, " \u2014 ", m.Email] }, m.ID))) })] }));
}
