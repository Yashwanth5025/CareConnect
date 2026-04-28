import React, { useEffect, useRef, useState } from "react";
import emailjs from "@emailjs/browser";

const ContactUs = () => {
  const form = useRef();
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Initialize EmailJS once
  useEffect(() => {
    try {
      emailjs.init({ publicKey: "1VwSSTs2MpCRqHAWA" });
    } catch {}
  }, []);

  const sendEmail = (e) => {
    e.preventDefault();
    if (isSending) return;
    setIsSending(true);
    setStatus("Sending...");

    emailjs
      .sendForm("service_j6ink4n", "template_e9rfqnc", form.current)
      .then(
        () => {
          setStatus("Message sent successfully!");
          form.current.reset();
          setIsSending(false);
        },
        (error) => {
          console.error(error);
          const msg = error?.text || error?.message || "Failed to send message. Try again later.";
          setStatus(msg);
          setIsSending(false);
        }
      );
  };

  return (
    <div className="bg-blue-900 text-white py-16 px-6 flex flex-col items-center min-h-screen">
      <h2 className="text-3xl font-bold mb-8 text-center">Contact Us</h2>

      <form
        ref={form}
        onSubmit={sendEmail}
        className="bg-white text-blue-900 p-8 rounded-2xl shadow-xl w-full max-w-lg"
      >
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Name</label>
          <input
            type="text"
            name="user_name"
            required
            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Your full name"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Email</label>
          <input
            type="email"
            name="user_email"
            required
            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="your@email.com"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Message</label>
          <textarea
            name="message"
            rows="5"
            required
            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Write your message here..."
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={isSending}
          className={`bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded-lg w-full transition-colors ${isSending ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isSending ? 'Sending...' : 'Send Message'}
        </button>

        {status && (
          <p
            className={`text-center mt-4 font-medium ${
              status.includes("successfully")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {status}
          </p>
        )}
      </form>

      <p className="mt-10 text-center text-blue-200 max-w-md">
        Have questions about player stats, scouting partnerships, or agent
        opportunities? We’d love to hear from you.
      </p>
    </div>
  );
};

export default ContactUs;