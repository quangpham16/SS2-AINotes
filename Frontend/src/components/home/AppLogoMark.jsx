const AppLogoMark = ({ className = 'h-7 w-7' }) => (
  <span className={`relative shrink-0 ${className}`} aria-hidden="true">
    <span className="absolute left-[3px] top-[3px] h-[21px] w-[21px] rounded-t-full border-[3px] border-b-0 border-current" />
    <span className="absolute left-[7px] top-[7px] h-[13px] w-[13px] rounded-t-full border-[3px] border-b-0 border-current" />
    <span className="absolute left-[11px] top-[11px] h-[5px] w-[5px] rounded-t-full border-[3px] border-b-0 border-current" />
  </span>
);

export default AppLogoMark;
