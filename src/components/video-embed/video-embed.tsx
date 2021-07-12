import { Component, h, Host, Element, Prop, State, Watch } from "@stencil/core";

@Component({
  tag: "video-embed",
  styleUrl: "video-embed.css",
  shadow: true
})
export class VideoEmbed {
  @Element() el: HTMLElement;

  /* Props  */
  @Prop() videoId: string;
  @Prop() videoProvider: string;
  @Prop() videoTitle: string = "Video";
  @Prop() playLabel: string = "Play";
  @Prop() youtubeParams: string = "";
  @Prop() autoplay: boolean = false;
  @Prop() startAt: number = 0;

  /* Watchers */
  @Watch("videoId")
  validateVideoId(newValue, oldValue) {
    if (oldValue !== newValue) {
      this.setupComponent();
      // if we have a previous iframe, remove it and the activated class
      if (this.iframeLoaded) {
        this.el.querySelector("iframe").remove();
        this.iframeLoaded = false;
      }
    }
  }

  /* Local variables */
  @State() iframeLoaded: boolean = false;
  @State() titleAttribute: string = `${this.playLabel}: ${this.videoTitle}`;
  @State() imageUrlWebp: string = "";
  @State() imageUrlJpeg: string = "";
  private domRefFrame?: HTMLElement;
  private preconnected: boolean = false;

  /* Lifecycle methods */
  connectedCallback() {
    this.el.addEventListener("pointerover", this.warmConnections.bind(this), {
      once: true
    });
  }
  disconnectedCallback() {
    this.el.removeEventListener("pointerover", this.warmConnections.bind(this));
  }

  componentDidLoad() {
    this.setupComponent();
  }

  /* Methods */
  addIframe() {
    let srcUrl;
    if (this.videoProvider === "youtube") {
      srcUrl = new URL(
        `/embed/${this.videoId}?autoplay=1&start=${this.startAt}&${this.youtubeParams}&modestbranding=1`,
        "https://www.youtube-nocookie.com"
      );
    } else {
      srcUrl = new URL(`/video/${this.videoId}?autoplay=1&#t=${this.startAt}`, "https://player.vimeo.com");
    }

    if (!this.iframeLoaded) {
      const iframeHTML = `
                <iframe
                    src="${srcUrl}"
                    title="${this.playLabel}: ${this.videoTitle}"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    frameborder="0" />
            `;
      this.domRefFrame.insertAdjacentHTML("beforeend", iframeHTML);
      this.iframeLoaded = true;
    }
  }

  initImagePlaceholderYoutube() {
    this.addPrefetch("preconnect", "https://i.ytimg.com/");

    this.imageUrlWebp = `https://i.ytimg.com/vi_webp/${this.videoId}/hqdefault.webp`;
    this.imageUrlJpeg = `https://i.ytimg.com/vi/${this.videoId}/hqdefault.jpg`;
  }

  async initImagePlaceholderVimeo() {
    this.addPrefetch("preconnect", "https://i.vimeocdn.com/");

    const apiUrl = `https://vimeo.com/api/v2/video/${this.videoId}.json`;
    const apiResponse = (await (await fetch(apiUrl)).json())[0];
    const tnLarge = apiResponse.thumbnail_large;
    const imgId = tnLarge.substr(tnLarge.lastIndexOf("/") + 1).split("_")[0];
    this.imageUrlWebp = `https://i.vimeocdn.com/video/${imgId}.webp?mw=1100&mh=619&q=70`;
    this.imageUrlJpeg = `https://i.vimeocdn.com/video/${imgId}.jpg?mw=1100&mh=619&q=70`;
  }

  initIntersectionObserver() {
    if ("IntersectionObserver" in window && "IntersectionObserverEntry" in window) {
      const options = {
        root: null,
        rootMargin: "0px",
        threshold: 0
      };

      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.iframeLoaded) {
            this.warmConnections();
            this.addIframe();
            observer.unobserve(this.el);
          }
        });
      }, options);
      observer.observe(this.el);
    }
  }

  addPrefetch(kind, url) {
    const linkElem = document.createElement("link");
    linkElem.rel = kind;
    linkElem.href = url;
    linkElem.crossOrigin = "true";
    document.head.append(linkElem);
  }

  warmConnections() {
    if (this.preconnected) return;

    if (this.videoProvider === "youtube") {
      this.addPrefetch("preconnect", "https://s.ytimg.com");
      this.addPrefetch("preconnect", "https://www.youtube.com");
      this.addPrefetch("preconnect", "https://www.google.com");
      this.addPrefetch("preconnect", "https://googleads.g.doubleclick.net");
      this.addPrefetch("preconnect", "https://static.doubleclick.net");
    } else {
      this.addPrefetch("preconnect", "https://f.vimeocdn.com");
      this.addPrefetch("preconnect", "https://player.vimeo.com");
      this.addPrefetch("preconnect", "https://i.vimeocdn.com");
    }

    this.preconnected = true;
  }

  setupComponent() {
    this.videoProvider === "youtube" ? this.initImagePlaceholderYoutube() : this.initImagePlaceholderVimeo();

    if (this.autoplay) {
      this.initIntersectionObserver();
    }
  }

  render() {
    return (
      <Host title={this.titleAttribute}>
        <div
          id="frame"
          class={this.iframeLoaded ? "frame-activated" : ""}
          ref={(el) => (this.domRefFrame = el as HTMLElement)}
          onClick={() => this.addIframe()}
        >
          <picture>
            <source type="image/webp" srcSet={this.imageUrlWebp} />
            <source type="image/jpeg" srcSet={this.imageUrlJpeg} />
            <img
              id="fallbackPlaceholder"
              src={this.imageUrlJpeg}
              alt={this.titleAttribute}
              aria-label={this.titleAttribute}
              decoding="async"
              loading="lazy"
            />
          </picture>
          <button class={"play-button" + " play-button--" + this.videoProvider} aria-label={this.titleAttribute} />
        </div>
      </Host>
    );
  }
}
