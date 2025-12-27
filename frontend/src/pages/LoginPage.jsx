import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import Logo from "../assets/logo.svg?react";
import { LockIcon, MailIconn } from "lucide-react";
import { LoaderIcon } from "react-hot-toast";
import { Link } from "react-router";

function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoggingIn } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData);
    } catch (error) {
      console.log("Error logging up", error);
    }
  };

  return (
    <div className="w-full flex items-center justify-center p-4 bg-slate-900">
      <div className="relative w-full max-w-4xl md:h-[600px] h-[550px]">
        <BorderAnimatedContainer>
          <div className="w-full flex flex-col md:flex-row">
            {/* LEFT SECTION */}
            <div className="md:w-1/2 p-8 flex items-center justify-center md:border-r border-slate-600/30">
              <div className="w-full max-w-md">
                {/* Headding text */}
                <div className="text-center mb-8">
                  <Logo className="w-24 h-24 mx-auto text-slate-400" />
                  <h2 className="text-2xl font-bold text-slate-200 mb-2">
                    Wellcome Back
                  </h2>
                  <p className="text-slate-400">Login to access your account</p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Email */}
                  <div>
                    <label className="auth-input-label">Email</label>
                    <div className="relative">
                      <MailIcon className="auth-input-icon" />

                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="input"
                        placeholder="nva@gmail.com"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="auth-input-label">Password</label>
                    <div className="relative">
                      <LockIcon className="auth-input-icon" />

                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        className="input"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  {/* Sumbit button */}
                  <div>
                    <div className="auth-input-lable opacity-0 select-none">
                      Submit
                    </div>

                    <button
                      className="auth-btn flex items-center justify-center"
                      type="submit"
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? (
                        <LoaderIcon className="w-full h-5 p-2.5 animate-spin" />
                      ) : (
                        "Login"
                      )}
                    </button>
                  </div>

                  {/* Signup link */}
                  <div className="mt-6 text-center">
                    <Link to="/signup" className="auth-link">
                      Don't have an account? <strong>Sign up</strong>
                    </Link>
                  </div>
                </form>
              </div>
            </div>

            {/* RIGHT SECTION */}
            <div className="hidden md:w-1/2 md:flex items-center justify-center p-6 bg-gradient-to-bl from-slate-800/20 to-transparent">
              <div>
                <img
                  src="/images/login.png"
                  alt="People using mobile devices"
                  className="w-full h-auto object-contain"
                />
                <div className="mt-6 text-center">
                  <h3 className="text-xl font-medium text-cyan-400">
                    Connect anytime, anywhere
                  </h3>

                  <div className="mt-4 flex justify-center gap-4">
                    <span className="auth-badge">Free</span>
                    <span className="auth-badge">Easy Setup</span>
                    <span className="auth-badge">Private</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}

export default LoginPage;
