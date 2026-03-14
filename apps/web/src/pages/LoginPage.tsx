import { GoogleLogin } from "@react-oauth/google";
import { Paper, Typography, Box } from "@mui/material";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#0b0e17",
        background: "radial-gradient(ellipse at 50% 0%, rgba(124,92,252,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(0,229,160,0.1) 0%, transparent 50%), #0b0e17",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 6 },
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(20,24,36,0.9)",
          backdropFilter: "blur(20px)",
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "20px",
            background: "linear-gradient(135deg, #00e5a0 0%, #7c5cfc 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 3,
            fontSize: 32,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          S
        </Box>

        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: "#e8eaf0" }}>
          SafeView
        </Typography>
        <Typography variant="body1" sx={{ color: "#8a8fa8", mb: 4 }}>
          Track your Ethereum portfolio — balances, tokens, and real-time values.
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={async (res) => {
              if (!res.credential) return;
              try {
                await login(res.credential);
                navigate("/");
              } catch {
                toast.error("Login failed");
              }
            }}
            onError={() => toast.error("Google login failed")}
            theme="filled_black"
            size="large"
            shape="pill"
          />
        </Box>
      </Paper>
    </Box>
  );
}
