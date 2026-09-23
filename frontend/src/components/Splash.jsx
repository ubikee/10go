import logo from '../../images/10Go_Logo_Completo_Horizontal.png';

export function Splash({ onDone }) {
  return (
    <div
      className="splash"
      onAnimationEnd={(e) => {
        if (e.animationName === 'splash-fade') onDone();
      }}
    >
      <img className="splash__logo" src={logo} alt="10go" />
    </div>
  );
}
