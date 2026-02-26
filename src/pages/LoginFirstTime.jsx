import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginFirstTime.css";
import SelectInput from "../components/SelectInput";
import { sweetAlert } from "../components/SweetAlert";
// HELPER
import { verificarPin } from "../services/verificarPin";

import logo from "../assets/logo.svg";
import home from "../assets/home.svg";
import fondo from "../assets/fondo2.svg";
import WelcomeLayout from "../layouts/WelcomeLayout";

import TextInput from "../components/TextInput";

// ✅ Un solo punto de verdad para el backend (evita 127 vs localhost)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function LoginFirstTime() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    correo: "",
    celular: "",
    sede: "",
    cedula: "",
    codigo: "",
  });

  const [errors, setErrors] = useState({});
  const [pinEnviado, setPinEnviado] = useState(false);
  const [cooldown, setCooldown] = useState(0); // segundos
  const [saving, setSaving] = useState(false); // ✅ evita doble envío

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Normaliza sin dañar mayúsculas de nombres/sedes
  const normalizeForm = (f) => ({
    nombres: f.nombres.trim(),
    apellidos: f.apellidos.trim(),
    correo: f.correo.trim().toLowerCase(),
    celular: f.celular.replace(/\D/g, "").trim(), // solo dígitos
    sede: f.sede.trim(), // el Select ya da el valor correcto
    cedula: f.cedula.replace(/\D/g, "").trim(), // solo dígitos
  });

  const validar = () => {
    const e = {};

    if (!form.nombres.trim()) e.nombres = "Campo obligatorio";
    if (!form.apellidos.trim()) e.apellidos = "Campo obligatorio";

    if (!form.correo.trim()) e.correo = "Campo obligatorio";
    else if (!/^\S+@\S+\.\S+$/.test(form.correo.trim()))
      e.correo = "Correo inválido";

    const celularLimpio = form.celular.replace(/\D/g, "").trim();
    if (!celularLimpio) e.celular = "Campo obligatorio";
    else if (!/^\d{7,15}$/.test(celularLimpio))
      e.celular = "Solo números (7 a 15 dígitos)";

    if (!form.sede.trim()) e.sede = "Selecciona una sede";

    const cedulaLimpia = form.cedula.replace(/\D/g, "").trim();
    if (!cedulaLimpia) e.cedula = "Campo obligatorio";
    else if (!/^\d{6,10}$/.test(cedulaLimpia)) e.cedula = "Cédula inválida";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // contador
  const iniciarCooldown = (segundos = 40) => {
    setCooldown(segundos);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Guardar
  const handleGuardar = async () => {
    if (saving) return; // ✅ evita doble click
    console.log("CLICK GUARDAR ✅");

    const ok = validar();
    if (!ok) return;

    const dataNormalizada = normalizeForm(form);

    try {
      setSaving(true);

      // ✅ 0) Verifica si la cédula ya existe antes de registrar
      const checkRes = await fetch(`${API_URL}/verificacion/cedula`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: dataNormalizada.cedula }), // 👈 string
      });

      const checkData = await checkRes.json().catch(() => ({}));

      if (!checkRes.ok) {
        await sweetAlert({
          icon: "error",
          title: "Error verificando cédula",
          text:
            checkData?.detail || checkData?.message || "Intenta nuevamente.",
          confirmButtonText: "Ok",
        });
        return;
      }

      if (checkData?.ok) {
        await sweetAlert({
          icon: "warning",
          title: "Cédula ya registrada",
          text: "Esta cédula ya está registrada. Inicia sesión con tu PIN.",
          confirmButtonText: "Ok",
        });
        return; // ✅ no deja registrar
      }

      // ✅ 1) Registrar (solo si NO existe)
      const res = await fetch(`${API_URL}/verificacion/registro-inicial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataNormalizada),
      });

      console.log("STATUS:", res.status);

      const data = await res.json().catch(() => ({}));
      console.log("RESPUESTA BACKEND:", data);

      // ✅ muestra el error real del backend
      if (!res.ok) {
        await sweetAlert({
          icon: "error",
          title: "No se pudo guardar",
          text: data?.detail || data?.message || "Error desconocido",
          confirmButtonText: "Ok",
        });
        return;
      }

      if (data?.ok) {
        await sweetAlert({
          icon: "success",
          title: "Código enviado",
          html: `
            <p>Tu PIN ha sido enviado al correo registrado.</p>
            <p><b>Ojo:</b> si el correo está errado, no llegará el PIN.</p>
            <p><b>Revisa también la carpeta de spam.</b></p>
            <p>Tiempo estimado de llegada: 40s–2 minutos.</p>
          `,
          confirmButtonText: "Entendido",
        });

        setPinEnviado(true);
        iniciarCooldown(40);
      } else {
        await sweetAlert({
          icon: "warning",
          title: "Atención",
          text: data?.message || "No se pudo completar la solicitud.",
          confirmButtonText: "Ok",
        });
      }
    } catch (error) {
      console.error("ERROR FETCH:", error);
      await sweetAlert({
        icon: "error",
        title: "Sin conexión",
        text: "No se pudo conectar al servidor.",
        confirmButtonText: "Ok",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSolicitarCodigo = async () => {
    if (!pinEnviado) return;
    if (cooldown > 0) return;

    const cedula = form.cedula.replace(/\D/g, "").trim();

    if (!cedula) {
      await sweetAlert({
        icon: "warning",
        title: "Falta la cédula",
        text: "Ingresa tu cédula para poder reenviar el PIN.",
        confirmButtonText: "Ok",
      });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/verificacion/reenviar-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        await sweetAlert({
          icon: "error",
          title: "No se pudo reenviar",
          text: data?.detail || data?.message || "Intenta nuevamente.",
          confirmButtonText: "Ok",
        });
        return;
      }

      if (data?.email_sent) {
        await sweetAlert({
          icon: "success",
          title: "PIN reenviado",
          text: "Revisa tu bandeja de entrada y la carpeta de spam.",
          confirmButtonText: "Ok",
        });

        iniciarCooldown(40);
        return;
      }

      await sweetAlert({
        icon: "warning",
        title: "No se pudo enviar el correo",
        text: data?.email_error || "Revisa la configuración SMTP.",
        confirmButtonText: "Ok",
      });
    } catch (e) {
      console.error(e);
      await sweetAlert({
        icon: "error",
        title: "Sin conexión",
        text: "No se pudo conectar al servidor.",
        confirmButtonText: "Ok",
      });
    }
  };

  const handleVerificarCodigo = async () => {
    await verificarPin({
      cedula: form.cedula.replace(/\D/g, "").trim(),
      pin: form.codigo.trim(),
      navigate,
    });
  };

  return (
    <>
      <WelcomeLayout image={fondo} />

      <div className="BoxGeneral">
        <div className="Header">
          {/* LOGO */}
          <div className="HeaderLogo">
            <img
              src={logo}
              className="ImgLogo"
              alt="Logo"
              onClick={() => navigate("/")}
            />
          </div>

          {/* TÍTULO */}
          <div className="HeaderTitle">
            <h2 className="h2HeaderTittle">
              Bienvenidos al Sistema de Registro
            </h2>
          </div>

          {/* CASITA */}
          <div className="HeaderCasita">
            <img
              src={home}
              className="ImgHome"
              alt="Home"
              onClick={() => navigate("/")}
            />
          </div>
        </div>

        <div className="Content">
          {/* IZQUIERDA */}
          <div className="ColumnLeft">
            <TextInput
              label="Nombres Completos"
              name="nombres"
              value={form.nombres}
              onChange={handleChange}
              error={errors.nombres}
            />

            <TextInput
              label="Correo Institucional"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              type="email"
              error={errors.correo}
            />

            <SelectInput
              label="Sede"
              name="sede"
              value={form.sede}
              onChange={handleChange}
              options={[
                { value: "Poblado", label: "Poblado" },
                { value: "Laureles", label: "Laureles" },
                { value: "Barranquilla", label: "Barranquilla" },
              ]}
              error={errors.sede}
            />

            <button
              className="btn btn--primary"
              onClick={handleGuardar}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>

            <br />

            <TextInput
              label=""
              name="codigo"
              value={form.codigo}
              onChange={handleChange}
              placeholder="Ingrese Código"
              onKeyDown={(e) => e.key === "Enter" && handleVerificarCodigo()}
            />

            <button
              className="btn btn--primary"
              onClick={handleVerificarCodigo}
              disabled={!pinEnviado || !form.codigo.trim()}
            >
              Verificar PIN
            </button>
          </div>

          {/* DERECHA */}
          <div className="ColumnRight">
            <TextInput
              label="Apellidos Completos"
              name="apellidos"
              value={form.apellidos}
              onChange={handleChange}
              error={errors.apellidos}
            />

            <TextInput
              label="Celular"
              name="celular"
              value={form.celular}
              onChange={handleChange}
              inputMode="numeric"
              error={errors.celular}
            />

            <TextInput
              label="Cédula"
              name="cedula"
              value={form.cedula}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={10}
              error={errors.cedula}
            />

            <button
              className={`btn btn--secondary ${
                cooldown === 0 && pinEnviado ? "btn--ready" : ""
              }`}
              onClick={handleSolicitarCodigo}
              disabled={!pinEnviado || cooldown > 0}
            >
              Solicitar Nuevo Código
            </button>

            {pinEnviado && cooldown > 0 && (
              <p className="cooldown-text">
                ⏳ Podrás solicitar un nuevo código en{" "}
                <strong>{cooldown}</strong> segundos
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
