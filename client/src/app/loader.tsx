import { ColorRing } from "react-loader-spinner"

export const Loader = () => (
  <div className="flex flex-row justify-center">
    <ColorRing
      visible={true}
      height="80"
      width="80"
      ariaLabel="color-ring-loading"
      wrapperStyle={{}}
      wrapperClass="color-ring-wrapper"
      colors={["#1ed760", "#1ed760", "#1ed760", "#1ed760", "#1ed760"]}
    />
  </div>
)
