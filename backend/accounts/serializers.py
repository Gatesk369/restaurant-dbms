from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, trim_whitespace=True)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )


class StaffSummarySerializer(serializers.Serializer):
    staff_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)


class LoginResponseSerializer(serializers.Serializer):
    token = serializers.CharField(read_only=True)
    staff = StaffSummarySerializer(read_only=True)
