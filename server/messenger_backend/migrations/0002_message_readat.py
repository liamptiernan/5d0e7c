# Generated by Django 3.2.4 on 2022-04-18 12:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('messenger_backend', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='readAt',
            field=models.DateTimeField(null=True),
        ),
    ]