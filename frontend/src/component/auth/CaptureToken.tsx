import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuthStore } from "../../store/auth.store";

const CaptureToken = () => {

    const setAuth = useAuthStore((s) => s.setAuth);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();


    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            // 
        }
    }, [searchParams, setSearchParams, navigate])

    return (
        <div>
        </div>
    )
}

export default CaptureToken
