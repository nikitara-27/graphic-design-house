import houseIcon from "../assets/house-icon.svg";

interface Props { onStart: () => void }

export function Landing({ onStart }: Props) {
  return (
    <main className="screen landing">
      <img className="house-mark" src={houseIcon} alt="" width={19} height={22} />
      <h1 className="title">Graphic Design House</h1>
      <p className="lede">Walk through BU's Graphic Design curriculum, one room at a time. Answer 3 quick questions to get your profile.</p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onStart}>
          Start
        </button>
      </div>
    </main>
  );
}
