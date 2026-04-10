import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginFirstTime.css";

import SelectInput from "../components/SelectInput";
import TextInput from "../components/TextInput";
import WelcomeLayout from "../layouts/WelcomeLayout";

import {
  alertSuccess,
  alertError,
  alertWarning,
  alertUsuarioYaExiste,
} from "../lib/alerts/appAlert";
import { apiUrl } from "../lib/api/baseUrl";

import { verificarPin } from "../services/verificarPin";

import logo from "../assets/logo.svg";
import fondo from "../assets/fondo2.svg";
import { homeIconSrcForGender } from "../assets/homeIconSrc.js";
import { inferGenderFromName } from "../lib/inferGenderFromName";

const SEDES = [
  { value: "Poblado", label: "Poblado" },
  { value: "Laureles", label: "Laureles" },
  { value: "Barranquilla", label: "Barranquilla" },
];

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
  const [cooldown, setCooldown] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const normalizeForm = (data) => ({
    nombres: data.nombres.trim(),
    apellidos: data.apellidos.trim(),
    correo: data.correo.trim().toLowerCase(),
    celular: data.celular.replace(/\D/g, "").trim(),
    sede: data.sede.trim(),
    cedula: data.cedula.replace(/\D/g, "").trim(),
  });

  const validar = () => {
    const newErrors = {};

    if (!form.nombres.trim()) newErrors.nombres = "Campo obligatorio";
    if (!form.apellidos.trim()) newErrors.apellidos = "Campo obligatorio";

    if (!form.correo.trim()) {
      newErrors.correo = "Campo obligatorio";
    } else if (!/^\S+@\S+\.\S+$/.test(form.correo.trim())) {
      newErrors.correo = "Correo inválido";
    }

    const celularLimpio = form.celular.replace(/\D/g, "").trim();
    if (!celularLimpio) {
      newErrors.celular = "Campo obligatorio";
    } else if (!/^\d{7,15}$/.test(celularLimpio)) {
      newErrors.celular = "Solo números (7 a 15 dígitos)";
    }

    if (!form.sede.trim()) {
      newErrors.sede = "Selecciona una sede";
    }

    const cedulaLimpia = form.cedula.replace(/\D/g, "").trim();
    if (!cedulaLimpia) {
      newErrors.cedula = "Campo obligatorio";
    } else if (!/^\d{6,10}$/.test(cedulaLimpia)) {
      newErrors.cedula = "Cédula inválida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const handleSolicitarCodigoDirecto = async (cedulaParam) => {
    if (cooldown > 0) return;

    const cedula = (cedulaParam || form.cedula).replace(/\D/g, "").trim();

    if (!cedula) {
      await alertWarning({
        title: "Falta la cédula",
        text: "Ingresa tu cédula para poder reenviar el PIN.",
      });
      return;
    }

    try {
      const res = await fetch(apiUrl("/verificacion/reenviar-pin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cedula }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        await alertError({
          title: "No se pudo reenviar",
          text: data?.detail || data?.message || "Intenta nuevamente.",
        });
        return;
      }

      if (data?.ok) {
        const enviado = data?.correoEnviado !== false;
        await alertSuccess({
          title: enviado ? "PIN reenviado" : "No se envió el correo",
          html: enviado
            ? `
            <p>Si el correo está correcto, el PIN te llegará.</p>
            <p><b>Revisa spam</b> también.</p>
          `
            : `
            <p>No se pudo enviar el correo (SMTP). Tu usuario sigue en el sistema; intenta más tarde o contacta al administrador.</p>
          `,
        });

        setPinEnviado(true);
        if (enviado) iniciarCooldown(40);
        return;
      }

      await alertWarning({
        title: "No se pudo reenviar",
        text: data?.detail || data?.message || "Intenta nuevamente.",
      });
    } catch (error) {
      console.error(error);
      await alertError({
        title: "Sin conexión",
        text: "No se pudo conectar al servidor.",
      });
    }
  };

  const handleGuardar = async () => {
    if (saving) return;

    const formularioValido = validar();
    if (!formularioValido) return;

    const dataNormalizada = normalizeForm(form);

    try {
      setSaving(true);

      const checkRes = await fetch(apiUrl("/verificacion/cedula"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cedula: dataNormalizada.cedula }),
      });

      const checkData = await checkRes.json().catch(() => ({}));

      if (!checkRes.ok) {
        await alertError({
          title: "Error verificando cédula",
          text:
            checkData?.detail || checkData?.message || "Intenta nuevamente.",
        });
        return;
      }

      // Solo `exists`: en otros endpoints `ok` puede significar "petición OK", no "cédula existe".
      if (checkData?.exists === true) {
        setPinEnviado(true);

        await alertUsuarioYaExiste({
          onReenviarPin: async () => {
            await handleSolicitarCodigoDirecto(dataNormalizada.cedula);
          },
        });

        return;
      }

      const res = await fetch(apiUrl("/verificacion/registro-inicial"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataNormalizada),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          setPinEnviado(true);

          await alertUsuarioYaExiste({
            onReenviarPin: async () => {
              await handleSolicitarCodigoDirecto(dataNormalizada.cedula);
            },
          });

          return;
        }

        await alertError({
          title: "No se pudo guardar",
          text: data?.detail || data?.message || "Error desconocido",
        });
        return;
      }

      if (data?.ok) {
        const enviado = data?.correoEnviado !== false;
        await alertSuccess({
          title: enviado ? "Código enviado" : "Registro guardado",
          html: enviado
            ? `
            <p>Tu PIN ha sido enviado al correo registrado.</p>
            <p><b>Ojo:</b> si el correo está errado, no llegará el PIN.</p>
            <p><b>Revisa también la carpeta de spam.</b></p>
            <p>Tiempo estimado de llegada: 40s–2 minutos.</p>
          `
            : `
            <p>Tu registro quedó guardado, pero <b>no se pudo enviar el correo</b> desde el servidor (SMTP).</p>
            <p>Cuando el correo esté configurado, usa <b>Solicitar Nuevo Código</b> o pide ayuda al administrador.</p>
          `,
        });

        setPinEnviado(true);
        if (enviado) iniciarCooldown(40);
        return;
      }

      await alertWarning({
        title: "Atención",
        text: data?.message || "No se pudo completar la solicitud.",
      });
    } catch (error) {
      console.error("ERROR FETCH:", error);
      await alertError({
        title: "Sin conexión",
        text: "No se pudo conectar al servidor.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSolicitarCodigo = async () => {
    if (!pinEnviado) return;
    await handleSolicitarCodigoDirecto(form.cedula);
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

      <div className="BoxGeneral first-time-page">
        <header className="first-time-header">
          <div className="first-time-header__brand">
            <img
              src={logo}
              className="first-time-header__logo"
              alt="Logo"
              decoding="async"
              loading="lazy"
              onClick={() => navigate("/")}
            />
          </div>

          <div className="first-time-header__title-wrap">
            <h1 className="first-time-header__title">
              Bienvenidos al Sistema de Registro
            </h1>
          </div>

          <div
            className="first-time-header__home-wrap"
            role="button"
            tabIndex={0}
            aria-label="Ir al inicio"
            onClick={() => navigate("/")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/");
              }
            }}
          >
            <img
              className="first-time-header__home"
              src={homeIconSrcForGender(inferGenderFromName(form.nombres))}
              alt=""
              decoding="async"
              loading="lazy"
            />
          </div>
        </header>

        <main className="first-time-main">
          <div className="first-time-form">
            <TextInput
              label="Nombres Completos"
              name="nombres"
              value={form.nombres}
              onChange={handleChange}
              error={errors.nombres}
            />

            <TextInput
              label="Apellidos Completos"
              name="apellidos"
              value={form.apellidos}
              onChange={handleChange}
              error={errors.apellidos}
            />

            <TextInput
              label="Correo Institucional"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              type="email"
              error={errors.correo}
            />

            <TextInput
              label="Celular"
              name="celular"
              value={form.celular}
              onChange={handleChange}
              inputMode="numeric"
              error={errors.celular}
            />

            <SelectInput
              label="Sede"
              name="sede"
              value={form.sede}
              onChange={handleChange}
              options={SEDES}
              error={errors.sede}
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

            <div className="first-time-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleGuardar}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>

              <button
                type="button"
                className={`btn btn--secondary ${
                  cooldown === 0 && pinEnviado ? "btn--ready" : ""
                }`}
                onClick={handleSolicitarCodigo}
                disabled={!pinEnviado || cooldown > 0}
              >
                Solicitar Nuevo Código
              </button>
            </div>

            <section className="first-time-verify" aria-label="Verificación PIN">
              <div className="first-time-verify__code">
                <TextInput
                  label=""
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  placeholder="Ingrese Código"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleVerificarCodigo();
                    }
                  }}
                />

                <button
                  type="button"
                  className="btn btn--primary first-time-verify__pin-btn"
                  onClick={handleVerificarCodigo}
                  disabled={!pinEnviado || !form.codigo.trim()}
                >
                  Verificar PIN
                </button>
              </div>

              <div className="first-time-verify__hint">
                <p className="first-time-verify__hint-line">
                  Le llegará un código al correo (2 letras y 3 números, ej. AB123).
                  {pinEnviado && cooldown > 0 ? (
                    <>
                      {" "}
                      <span className="first-time-verify__cooldown">
                        {cooldown}s
                      </span>
                      .
                    </>
                  ) : null}
                </p>
                <p className="first-time-verify__warn">
                  Debes guardar el PIN para futuros ingresos.
                </p>
                {pinEnviado && cooldown > 0 ? (
                  <p className="first-time-verify__cooldown-note">
                    Podrás solicitar un nuevo código cuando termine la cuenta
                    regresiva.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
