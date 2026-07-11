/**
 * Decorative "stories" strip from the design. There is no stories feature in
 * the MVP backend, so this is static chrome to match the reference layout.
 */
const PUBLIC_STORIES = [
  { img: '/assets/images/card_ppl2.png', name: 'Ryan Roslansky' },
  { img: '/assets/images/card_ppl3.png', name: 'Dylan Field' },
  { img: '/assets/images/card_ppl4.png', name: 'Steve Jobs' },
];

export function Stories() {
  return (
    <div className="_feed_inner_ppl_card _mar_b16">
      <div className="row">
        <div className="col-xl-3 col-lg-3 col-md-4 col-sm-4 col">
          <div className="_feed_inner_profile_story _b_radious6">
            <div className="_feed_inner_profile_story_image">
              <img src="/assets/images/card_ppl1.png" alt="" className="_profile_story_img" />
              <div className="_feed_inner_story_txt">
                <div className="_feed_inner_story_btn">
                  <span className="_feed_inner_story_btn_link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 10 10">
                      <path stroke="#fff" strokeLinecap="round" d="M.5 4.884h9M4.884 9.5v-9" />
                    </svg>
                  </span>
                </div>
                <p className="_feed_inner_story_para">Your Story</p>
              </div>
            </div>
          </div>
        </div>
        {PUBLIC_STORIES.map((story, i) => (
          <div
            key={story.name}
            className={`col-xl-3 col-lg-3 col-md-4 col-sm-4 ${i === 1 ? '_custom_mobile_none' : ''} ${i === 2 ? '_custom_none' : ''}`}
          >
            <div className="_feed_inner_public_story _b_radious6">
              <div className="_feed_inner_public_story_image">
                <img src={story.img} alt="" className="_public_story_img" />
                <div className="_feed_inner_pulic_story_txt">
                  <p className="_feed_inner_pulic_story_para">{story.name}</p>
                </div>
                <div className="_feed_inner_public_mini">
                  <img src="/assets/images/mini_pic.png" alt="" className="_public_mini_img" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
