import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import emailjs from '@emailjs/browser';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {
  formData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  isLoading = false;
  isSuccess = false;
  errorMessage = '';

  async sendEmail(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.isSuccess = false;

    const serviceID = 'service_c4y5jt6'; 
    const templateID = 'template_esfvqj5'; 
    const publicKey = 'U2xFXa2IIjWE9bO77'; 

    const templateParams = {
      from_name: this.formData.name,
      from_email: this.formData.email,
      subject: this.formData.subject,
      message: this.formData.message
    };

    try {
      await emailjs.send(serviceID, templateID, templateParams, publicKey);
      this.isSuccess = true;
      this.formData = { name: '', email: '', subject: '', message: '' }; // Formu temizle
    } catch (error: any) {
      console.error('Email gönderim hatası:', error);
      this.errorMessage = 'Mesajınız gönderilirken bir hata oluştu. Lütfen tekrar deneyin.';
    } finally {
      this.isLoading = false;
    }
  }
}