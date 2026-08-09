from django.db import models

class SuperAdmin(models.Model):
    admin_id = models.AutoField(primary_key=True)
    admin_name = models.CharField(max_length=100)
    admin_email = models.CharField(max_length=100, unique=True)
    admin_phone = models.CharField(max_length=15, null=True, blank=True)
    admin_password = models.CharField(max_length=255)
    admin_is_active = models.BooleanField(default=True)
    admin_created_at = models.DateTimeField(auto_now_add=True)
    admin_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_super_admin'
        managed = False

    def __str__(self):
        return self.admin_name


class Hospital(models.Model):
    hospital_id = models.AutoField(primary_key=True)
    hospital_uid = models.CharField(max_length=20, unique=True)
    hospital_name = models.CharField(max_length=100)
    hospital_email = models.CharField(max_length=100, null=True, blank=True)
    hospital_phone = models.CharField(max_length=15)
    hospital_address = models.TextField(null=True, blank=True)
    hospital_status = models.CharField(max_length=20, default='Pending')
    hospital_is_active = models.BooleanField(default=True)
    hospital_created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_hospital'
        managed = False

    def __str__(self):
        return self.hospital_name
