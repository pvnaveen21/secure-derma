import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BannersService } from '@app/services/secura/banners.service';
import { ThumbnailUploadComponent } from '@app/shared/directives/thumbnail-upload/thumbnail-upload.component';
import { NzMessageService } from 'ng-zorro-antd/message';

interface BannerItem {
  key: string;
  label: string;
  type: 'single' | 'multiple';
  uploadLabel: string[];
}

interface BannerSection {
  title: string;
  items: BannerItem[];
}

@Component({
  selector: 'app-banners',
  imports: [
    ThumbnailUploadComponent, CommonModule
  ],
  templateUrl: './banners.component.html',
  styleUrl: './banners.component.scss'
})
export class BannersComponent {

  bannerSections: BannerSection[] = [
    {
      title: 'Main Image Banner',
      items: [
        { key: 'main_image_web', label: 'Web Banner', type: 'single', uploadLabel: ['Upload desktop main banner', 'Suggested: wide landscape image'] },
        { key: 'main_image_mobile', label: 'Mobile Banner', type: 'single', uploadLabel: ['Upload mobile main banner', 'Suggested: portrait-friendly image'] }
      ]
    },
    {
      title: 'Default Banner',
      items: [
        { key: 'default_banner_web', label: 'Web Banner', type: 'single', uploadLabel: ['Upload desktop default banner', 'Suggested: wide landscape image'] },
        { key: 'default_banner_mobile', label: 'Mobile Banner', type: 'single', uploadLabel: ['Upload mobile default banner', 'Suggested: portrait-friendly image'] }
      ]
    },
    {
      title: 'Landing Page Banner',
      items: [
        { key: 'landing_page_web', label: 'Web Banner', type: 'multiple', uploadLabel: ['Upload desktop landing banner', 'File Type: PNG, JPEG'] },
        { key: 'landing_page_mobile', label: 'Mobile Banner', type: 'multiple', uploadLabel: ['Upload mobile landing banner', 'File Type: PNG, JPEG'] }
      ]
    },
    {
      title: 'General Banners',
      items: [
        { key: 'why_secure_derma', label: 'Why Secure Derma', type: 'single', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] },
        { key: 'login', label: 'Login', type: 'single', uploadLabel: ['Upload login showcase image', 'File Type: PNG, JPEG'] },
      ]
    },
    {
      title: 'Skin',
      items: [
        { key: 'skin_thumbnail', label: 'Skin Thumbnail', type: 'single', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] },
        { key: 'skin-care', label: 'Skin Banner', type: 'multiple', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] }
      ]
    },
    {
      title: 'Hair',
      items: [
        { key: 'hair_thumbnail', label: 'Hair Thumbnail', type: 'single', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] },
        { key: 'hair-care', label: 'Hair Banner', type: 'multiple', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] }
      ]
    },
    {
      title: 'Supplements',
      items: [
        { key: 'supplement_thumbnail', label: 'Supplement Thumbnail', type: 'single', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] },
        { key: 'supplements', label: 'Supplement Banner', type: 'multiple', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] }
      ]
    },
    {
      title: 'Pediatric',
      items: [
        { key: 'pediatric_thumbnail', label: 'Pediatric Thumbnail', type: 'single', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] },
        { key: 'pediatric', label: 'Pediatric Banner', type: 'multiple', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] }
      ]
    },
    {
      title: 'Shop All',
      items: [
        { key: 'all', label: 'Shop All', type: 'multiple', uploadLabel: ['Upload Image Size 1270x240', 'File Type: PNG, JPEG'] }
      ]
    }
  ];

  groupedBanners: any = {};

  constructor(
    private bannerService: BannersService,
    private message: NzMessageService,
  ) { }

  ngOnInit() {
    this.getAllImages();
  }

  get bannerTypes(): BannerItem[] {
    return this.bannerSections.flatMap((section) => section.items);
  }

  getBannerConfig(type: string): BannerItem | undefined {
    return this.bannerTypes.find((item) => item.key === type);
  }

  /** 🔥 Fetch grouped banners from backend */
  getAllImages() {
    this.bannerService.getAllImagesList().subscribe((res: any) => {

      // res already structured correctly
      this.groupedBanners = res;

      // ensure each type has at least one upload row
      this.bannerTypes.forEach(item => {
        if (!this.groupedBanners[item.key] || this.groupedBanners[item.key].length === 0) {
          this.groupedBanners[item.key] = [{ image: '', id: '' }];
        }
        else {
          if (item.type == 'multiple') {
            this.groupedBanners[item.key].push({ image: '', id: '' });
          }

        }

      });
    });
  }

  /** 🔥 When user selects image */
  onThumbnailSelected(file: File | null, index: number, type: string) {
    if (!file) return;

    this.bannerService.addNewBanner(file, type).subscribe({
      next: (res: any) => {
        const bannerConfig = this.getBannerConfig(type);
        this.message.success('File uploaded successfully');

        // update UI instantly
        this.groupedBanners[type][index].id = res?.id;
        this.groupedBanners[type][index].image = URL.createObjectURL(file);

        // add new blank placeholder        
        if (bannerConfig?.type == 'multiple') {
          this.addBanner(type);
        }
      }
    });
  }

  deleteImgValue(fileID: any, type: string) {
    this.bannerService.deleteBanner(fileID).subscribe({
      next: () => this.removeFile(fileID, type)
    });
  }

  removeFile(fileID: any, type: string) {
    const arr = this.groupedBanners[type];
    const index = arr.findIndex((item: any) => item.id === fileID);

    if (index > -1) arr.splice(index, 1);

    // keep one empty upload block
    if (arr.length === 0) {
      arr.push({ image: '', id: '' });
    }
  }

  addBanner(type: string) {
    const list = this.groupedBanners[type];

    const allFilled = list.every((item: any) => item.image);
    if (allFilled) {
      list.push({ image: '', id: '' });
    }
  }
}
