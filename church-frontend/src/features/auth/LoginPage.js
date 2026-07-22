import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { loginRequest } from "./api";
// This is the ONE login screen for the whole application - every
// ministry/ops module links here when a user isn't authenticated.
// No feature builds its own login form.
export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        try {
            const { token, user } = await loginRequest(email, password);
            login(token, user);
            navigate("/");
        }
        catch {
            setError("Invalid email or password");
        }
    }
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsx("h1", { children: "HOF Church - Sign in" }), _jsx("p", { children: "One login for every ministry and operations tool." }), _jsx("input", { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value) }), _jsx("input", { type: "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value) }), error && _jsx("p", { role: "alert", children: error }), _jsx("button", { type: "submit", children: "Sign in" })] }));
}
