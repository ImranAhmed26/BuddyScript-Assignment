import { useRef, useState, type FormEvent } from 'react';
import { useCreatePost } from '../api/posts';
import type { Visibility } from '../lib/types';
import { getErrorMessage } from '../lib/apiClient';
import { useAuthStore } from '../store/authStore';
import { Avatar } from './Avatar';

export function CreatePost() {
  const user = useAuthStore((s) => s.user);
  const createPost = useCreatePost();
  const fileInput = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickImage = (file: File | null) => {
    setImage(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const reset = () => {
    setContent('');
    setVisibility('PUBLIC');
    pickImage(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!content.trim() && !image) {
      setError('Write something or add an image.');
      return;
    }
    try {
      await createPost.mutateAsync({ content: content.trim(), visibility, image });
      reset();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not publish your post'));
    }
  };

  return (
    <div className="_feed_inner_text_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
      <form onSubmit={onSubmit}>
        <div className="_feed_inner_text_area_box">
          <div className="_feed_inner_text_area_box_image">
            {user && <Avatar user={user} size={45} />}
          </div>
          <div className="form-floating _feed_inner_text_area_box_form" style={{ flex: 1 }}>
            <textarea
              className="form-control _textarea"
              placeholder="Write something ..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ minHeight: 60 }}
            />
          </div>
        </div>

        {preview && (
          <div className="bs-image-preview">
            <img src={preview} alt="Selected upload preview" />
            <button type="button" onClick={() => pickImage(null)} aria-label="Remove image">
              ✕
            </button>
          </div>
        )}

        {error && <p className="bs-error-text">{error}</p>}

        <div className="bs-composer-actions">
          <button
            type="button"
            className="_feed_inner_text_area_bottom_photo_link bs-clickable"
            onClick={() => fileInput.current?.click()}
          >
            📷 Photo
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
          />

          <label className="bs-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Visibility
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </label>

          <div className="_feed_inner_text_area_btn" style={{ marginLeft: 'auto' }}>
            <button
              type="submit"
              className="_feed_inner_text_area_btn_link"
              disabled={createPost.isPending}
            >
              <span>{createPost.isPending ? 'Posting…' : 'Post'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
