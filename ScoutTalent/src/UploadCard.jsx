import React from 'react'

const UploadCard = ({ url, title, age, subtitle, team }) => {
  return (
      <div
        className=" rounded-xl p-6 shadow-lg w-[250px] text-center"
        style={{
          backgroundImage: "url('https://res.cloudinary.com/dhuado5jg/image/upload/v1761036333/download_xvmdnk.jpg')",
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
            <img
              src={url}
              alt="Player"
              className="rounded-md h-40 w-full object-cover mb-4"
            />
            <div className="text-lg font-bold">{title}</div>
            <div className="flex justify-between mt-1 text-sm font-semibold">
              <span>{age}</span>
              <span>{subtitle}</span>
            </div>
            <hr className="my-2" />
            <div className="text-sm">{team}</div>
          </div>
  )
}

export default UploadCard
