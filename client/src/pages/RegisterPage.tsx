import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/apiClient';

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== repeatPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register({ firstName, lastName, email, password });
      navigate('/feed', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to register'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="_social_registration_wrapper _layout_main_wrapper">
      <div className="_shape_one">
        <img src="/assets/images/shape1.svg" alt="" className="_shape_img" />
      </div>
      <div className="_shape_two">
        <img src="/assets/images/shape2.svg" alt="" className="_shape_img" />
      </div>
      <div className="_shape_three">
        <img src="/assets/images/shape3.svg" alt="" className="_shape_img" />
      </div>
      <div className="_social_registration_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_registration_right">
                <div className="_social_registration_right_image">
                  <img src="/assets/images/registration.png" alt="Register" />
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_registration_content">
                <div className="_social_registration_right_logo _mar_b28">
                  <img src="/assets/images/logo.svg" alt="Buddy Script" className="_right_logo" />
                </div>
                <p className="_social_registration_content_para _mar_b8">Get Started Now</p>
                <h4 className="_social_registration_content_title _titl4 _mar_b50">Registration</h4>

                <form className="_social_registration_form" onSubmit={onSubmit}>
                  <div className="row">
                    <div className="col-xl-6 col-lg-6 col-md-6 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">First name</label>
                        <input
                          type="text"
                          className="form-control _social_registration_input"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          autoComplete="given-name"
                        />
                      </div>
                    </div>
                    <div className="col-xl-6 col-lg-6 col-md-6 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">Last name</label>
                        <input
                          type="text"
                          className="form-control _social_registration_input"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          autoComplete="family-name"
                        />
                      </div>
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">Email</label>
                        <input
                          type="email"
                          className="form-control _social_registration_input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">Password</label>
                        <input
                          type="password"
                          className="form-control _social_registration_input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8">
                          Repeat Password
                        </label>
                        <input
                          type="password"
                          className="form-control _social_registration_input"
                          value={repeatPassword}
                          onChange={(e) => setRepeatPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  </div>

                  {error && <p className="bs-error-text">{error}</p>}

                  <div className="row">
                    <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                      <div className="_social_registration_form_btn _mar_t40 _mar_b60">
                        <button
                          type="submit"
                          className="_social_registration_form_btn_link _btn1"
                          disabled={submitting}
                        >
                          {submitting ? 'Creating account…' : 'Register now'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_registration_bottom_txt">
                      <p className="_social_registration_bottom_txt_para">
                        Already have an account? <Link to="/login">Login</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
