import "./WelcomeLayout.css";

export default function WelcomeLayout({ image }) {
  return (
    <div className="welcome-bg" aria-hidden="true">
      <img className="welcome-bg__image" src={image} alt="" />
    </div>
  );
}
