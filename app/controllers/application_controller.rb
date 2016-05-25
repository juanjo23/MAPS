class ApplicationController < ActionController::Base
  before_action :configure_permitted_parameters, if: :devise_controller?
  before_action :check_for_results!

  def profile_complete!
    redirect_to edit_user_registration_path,
      alert: "Necesita completar los campos: Organización y puesto en su perfil antes de comenzar" unless current_user.has_profile_complete?
  end


  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  protected
  def configure_permitted_parameters

    devise_parameter_sanitizer.for(:sign_up).push(:name, :company_id, :position)
    devise_parameter_sanitizer.for(:account_update).push(:name, :company_id, :position)
  end

  private
  def check_for_results!
    if user_signed_in?
      up = UserPractice.where("user_id": current_user.id)
      if up.count > 0
        if UserPractice.where("user_id": current_user.id).last.answer.nil?
          @results_exist = false
        else
          @results_exist = true
        end
      end
    end
  end
end
