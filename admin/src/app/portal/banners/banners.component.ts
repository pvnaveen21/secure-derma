import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BannersService } from '@app/services/secura/banners.service';
import { ThumbnailUploadComponent } from '@app/shared/directives/thumbnail-upload/thumbnail-upload.component';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-banners',
  imports: [
    ThumbnailUploadComponent, CommonModule
  ],
  templateUrl: './banners.component.html',
  styleUrl: './banners.component.scss'
})
export class BannersComponent {

  bannerTypes = [
    { key: "default_banner", label: "Default Banner", type: 'single' },
    { key: "main_image", label: "Main Image Banner", type: 'single' },
    { key: "why_secure_derma", label: "Why Secure Derma", type: 'single' },
    { key: "landing_page", label: "Landing Page Banner", type: 'multiple' },

    { key: "skin_thumbnail", label: "Skin Thumbnail", type: 'single' },
    { key: "skin-care", label: "Skin Banner", type: 'multiple' },

    { key: "hair_thumbnail", label: "Hair Thumbnail", type: 'single' },
    { key: "hair-care", label: "Hair Banner", type: 'multiple' },

    { key: "supplement_thumbnail", label: "Supplement Thumbnail", type: 'single' },
    { key: "supplements", label: "Supplement Banner", type: 'multiple' },

    { key: "pediatric_thumbnail", label: "Pediatric", type: 'single' },
    { key: "pediatric", label: "Pediatric Banner", type: 'multiple' },

    { key: "all", label: "Shop All", type: 'multiple' }
  ];

  groupedBanners: any = {};

  constructor(
    private bannerService: BannersService,
    private message: NzMessageService,
  ) { }

  ngOnInit() {
    this.getAllImages();
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
    console.log(file);
    
    if (!file) return;

    this.bannerService.addNewBanner(file, type).subscribe({
      next: (res: any) => {
        // console.log(file);
        // console.log(type);
        const findindexValue = this.bannerTypes.findIndex((value: any) => {
          return value.key == type
        })
        this.message.success('File uploaded successfully');

        // update UI instantly
        this.groupedBanners[type][index].id = res?.id;
        this.groupedBanners[type][index].image = URL.createObjectURL(file);

        // add new blank placeholder        
        if (this.bannerTypes[findindexValue].type == 'multiple') {
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
